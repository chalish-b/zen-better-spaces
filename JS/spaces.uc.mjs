// ==UserScript==
// @name           Spaces
// @description    A full-window spaces view, opened from a sidebar button or a shortcut
// ==/UserScript==

const HTML = "http://www.w3.org/1999/xhtml";
const STYLESHEET = "chrome://userchrome/content/spaces.css";
const BUTTON_ID = "zen-better-spaces-button";
const BUTTON_PLACED_PREF = "zenBetterSpaces.buttonPlaced";
const SHORTCUT = { modifiers: "accel", key: "E" };

function el(tag, className) {
  const element = document.createElementNS(HTML, tag);
  if (className) element.className = className;
  return element;
}

function spaceIcon(space) {
  const icon = el("div", "zen-better-spaces-space-icon");
  const value = gZenWorkspaces.getWorkspaceIcon(space);
  if (value?.endsWith(".svg")) {
    const image = el("img");
    image.src = value;
    icon.append(image);
  } else {
    icon.textContent = value ?? "";
  }
  return icon;
}

function tabCount(space) {
  return gZenWorkspaces.allStoredTabs.filter(
    (tab) => tab.getAttribute("zen-workspace-id") === space.uuid && !tab.hasAttribute("zen-empty-tab")
  ).length;
}

class SpacesView {
  #root = null;
  #previousFocus = null;

  get isOpen() {
    return !!this.#root;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    this.#previousFocus = document.commandDispatcher.focusedElement;

    const root = el("div");
    root.id = "zen-better-spaces";
    root.addEventListener("click", (event) => {
      if (event.target === root) this.close();
    });
    root.addEventListener("keydown", (event) => this.#onKeyDown(event));

    const grid = el("div", "zen-better-spaces-grid");
    for (const space of gZenWorkspaces.getWorkspaces()) {
      grid.append(this.#spaceTile(space));
    }
    grid.append(this.#newSpaceTile());
    root.append(grid);

    document.documentElement.append(root);
    this.#root = root;
    (grid.querySelector("[active]") ?? grid.firstElementChild).focus();
  }

  close({ restoreFocus = true } = {}) {
    if (!this.#root) return;
    this.#root.remove();
    this.#root = null;
    if (restoreFocus) this.#previousFocus?.focus();
    this.#previousFocus = null;
  }

  #spaceTile(space) {
    const tile = el("button", "zen-better-spaces-space");
    const { gradient, isDarkMode } = gZenThemePicker.getGradientForWorkspace(space);
    tile.style.setProperty("--zen-better-spaces-space-gradient", gradient);
    tile.toggleAttribute("dark", isDarkMode);
    tile.toggleAttribute("active", space.uuid === gZenWorkspaces.activeWorkspace);

    const name = el("div", "zen-better-spaces-space-name");
    name.textContent = space.name;
    const count = el("div", "zen-better-spaces-space-count");
    const tabs = tabCount(space);
    count.textContent = tabs === 1 ? "1 tab" : `${tabs} tabs`;
    tile.append(spaceIcon(space), name, count);

    tile.addEventListener("click", () => {
      this.close({ restoreFocus: false });
      gZenWorkspaces.changeWorkspace(space);
    });
    return tile;
  }

  #newSpaceTile() {
    const tile = el("button", "zen-better-spaces-space zen-better-spaces-space-new");
    const icon = el("div", "zen-better-spaces-space-icon");
    icon.textContent = "+";
    const name = el("div", "zen-better-spaces-space-name");
    name.textContent = "New Space";
    tile.append(icon, name);
    tile.addEventListener("click", () => {
      this.close({ restoreFocus: false });
      gZenWorkspaces.openWorkspaceCreation();
    });
    return tile;
  }

  #onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    const tiles = [...this.#root.querySelectorAll(".zen-better-spaces-space")];
    const index = tiles.indexOf(document.activeElement);
    if (index === -1) return;
    const columns = tiles.filter((tile) => tile.offsetTop === tiles[0].offsetTop).length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key];
    if (!step) return;
    event.preventDefault();
    tiles[Math.max(0, Math.min(tiles.length - 1, index + step))].focus();
  }
}

// The widget is global, so only the first window creates it. On first run it
// takes the place of Zen's space switcher in the sidebar footer. Zen's footer
// doesn't call a widget's onCommand, so each window listens for the button's
// command event instead.
function createButton() {
  if (CustomizableUI.getWidget(BUTTON_ID)?.provider === CustomizableUI.PROVIDER_API) return;
  CustomizableUI.createWidget({
    id: BUTTON_ID,
    type: "button",
    label: "Spaces",
    tooltiptext: "Spaces",
    defaultArea: "zen-sidebar-foot-buttons"
  });
  if (Services.prefs.getBoolPref(BUTTON_PLACED_PREF, false)) return;
  const switcher = CustomizableUI.getPlacementOfWidget("zen-workspaces-button");
  if (switcher) {
    CustomizableUI.addWidgetToArea(BUTTON_ID, switcher.area, switcher.position);
  }
  Services.prefs.setBoolPref(BUTTON_PLACED_PREF, true);
}

function isShortcut(key) {
  const modifiers = (key.getAttribute("modifiers") ?? "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((modifier) => (modifier === "meta" ? "accel" : modifier));
  return (
    key.getAttribute("key")?.toUpperCase() === SHORTCUT.key &&
    modifiers.sort().join(" ") === SHORTCUT.modifiers.split(" ").sort().join(" ")
  );
}

// Turns off any built-in key on the same shortcut, such as Firefox's "find
// selection". Zen builds its keys after startup, so this runs again once
// they're ready.
function disableConflictingKeys() {
  for (const key of document.querySelectorAll("key")) {
    if (!key.closest("#ucKeySet") && isShortcut(key)) key.setAttribute("disabled", "true");
  }
}

async function init() {
  windowUtils.loadSheetUsingURIString(STYLESHEET, windowUtils.AUTHOR_SHEET);
  await gZenWorkspaces.promiseInitialized;

  const view = new SpacesView();
  createButton();
  document.addEventListener("command", (event) => {
    if (event.target.id === BUTTON_ID) view.toggle();
  });
  await UC_API.Hotkeys.define({ id: "zenBetterSpaces", ...SHORTCUT, command: () => view.toggle() }).attachToWindow(window);
  disableConflictingKeys();
  window.addEventListener("ZenKeyboardShortcutsReady", disableConflictingKeys);
}

init().catch((error) => console.error("[zen-better-spaces] failed to start", error));
