// ==UserScript==
// @name           Demo seed
// @description    Fills the demo profile with sample spaces. Only loaded by demo-profile.sh.
// ==/UserScript==

const SEEDED_PREF = "zenBetterSpaces.demo.seeded";

// Each color is [rgb, picker position], as Zen's theme picker saves them.
// Spaces without a theme use Zen's default background.
const SPACES = [
  { name: "Inbox", icon: "📥", tabs: 23, theme: theme(0.72, "floating", 70, [[[209, 148, 157], [296, 162]]]) },
  { name: "Memory & Learning", tabs: 6, theme: theme(0.655, "floating", 35, [[[71, 108, 93], [39, 241]]]) },
  { name: "Rust Async Internals", icon: "🦀", tabs: 19, theme: theme(0.796, "floating", 35, [[[127, 53, 51], [292, 182]]]) },
  {
    name: "Music",
    icon: "🎵",
    tabs: 11,
    theme: theme(0.711, "singleAnalogous", 30, [
      [[99, 72, 54], [304, 237]],
      [[99, 54, 73], [304, 121]]
    ])
  },
  {
    name: "Shader Experiments",
    tabs: 14,
    theme: theme(0.673, "analogous", 40, [
      [[99, 75, 129], [171, 37]],
      [[129, 75, 115], [283, 82]],
      [[75, 96, 129], [65, 94]]
    ])
  },
  {
    name: "Compilers & LLVM",
    tabs: 9,
    theme: theme(0.756, "analogous", 10, [
      [[23, 10, 41], [173, 105]],
      [[41, 10, 34], [232, 127]],
      [[10, 23, 41], [118, 136]]
    ])
  },
  { name: "ELF & Dynamic Linking", tabs: 7, theme: theme(0.634, "floating", 20, [[[78, 60, 24], [250, 240]]]) },
  { name: "Procedural Terrain", icon: "🏔️", tabs: 16, theme: theme(0.634, "floating", 30, [[[131, 63, 22], [231, 201]]]) },
  { name: "Database Internals", tabs: 4 },
  { name: "Japanese", icon: "🇯🇵", tabs: 8 },
  { name: "Game Physics", icon: "🎱", tabs: 12 },
  { name: "Distributed Systems Papers", tabs: 5 }
];

function theme(opacity, algorithm, lightness, colors) {
  return {
    type: "gradient",
    gradientColors: colors.map(([c, [x, y]], index) => ({
      c,
      isCustom: false,
      algorithm,
      isPrimary: index === 0,
      lightness,
      position: { x, y },
      type: "explicit-lightness"
    })),
    opacity,
    texture: 0
  };
}

async function seed() {
  await gZenWorkspaces.promiseInitialized;
  const original = gZenWorkspaces.getWorkspaces().map((space) => space.uuid);

  const created = [];
  for (const { name, icon, theme, tabs } of SPACES) {
    const space = await gZenWorkspaces.createAndSaveWorkspace(name);
    Object.assign(space, { name, icon, theme: theme ?? space.theme });
    gZenWorkspaces.saveWorkspace(space);
    gZenThemePicker.invalidateGradientCache(space.uuid);

    // Unloaded tabs only get their space from Zen once they load, so it's set here.
    const newTabs = Array.from({ length: tabs }, (_, index) => {
      const tab = gBrowser.addTrustedTab(`https://example.com/${index + 1}`, {
        inBackground: true,
        skipAnimation: true,
        createLazyBrowser: true
      });
      tab.setAttribute("zen-workspace-id", space.uuid);
      gBrowser.setInitialTabTitle(tab, `Tab ${index + 1}`);
      return tab;
    });
    gZenWorkspaces.moveTabsToWorkspace(newTabs, space.uuid);
    created.push(space);
  }

  await gZenWorkspaces.changeWorkspace(created[0]);
  for (const uuid of original) {
    await gZenWorkspaces.removeWorkspace(uuid);
  }
}

if (!Services.prefs.getBoolPref(SEEDED_PREF, false)) {
  Services.prefs.setBoolPref(SEEDED_PREF, true);
  seed().catch((error) => console.error("[zen-better-spaces] demo seed failed", error));
}
