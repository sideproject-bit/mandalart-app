export const THEMES = {
  mondrian: { name: { en: "Mondrian", ko: "몬드리안" }, accents: ["#C7382E", "#2B3DCB", "#E3B22E"] },
  blue:     { name: { en: "Neptune",  ko: "해왕성" },   accents: ["#2B3DCB", "#2B3DCB", "#2B3DCB"] },
  red:      { name: { en: "Mars",     ko: "화성" },     accents: ["#C7382E", "#C7382E", "#C7382E"] },
  green:    { name: { en: "Earth",    ko: "지구" },     accents: ["#1F7A4D", "#1F7A4D", "#1F7A4D"] },
  yellow:   { name: { en: "Venus",    ko: "금성" },     accents: ["#E3B22E", "#E3B22E", "#E3B22E"] },
  bw:       { name: { en: "Mercury",  ko: "수성" },     accents: ["#888884", "#888884", "#888884"] },
};

// Per-theme home screen block colors (title block darker, manage block slightly lighter)
const HOME_BLOCKS = {
  mondrian: { title: "#2B3DCB", manage: "#C7382E" },
  blue:     { title: "#1a2a9e", manage: "#2B3DCB" },
  red:      { title: "#9e2822", manage: "#C7382E" },
  green:    { title: "#145233", manage: "#1F7A4D" },
  yellow:   { title: "#b38820", manage: "#E3B22E" },
  bw:       { title: "#4a4a48", manage: "#6b6b68" },
};

// Per-theme home feature tiles: [background, text] for planner / mandalart / pomodoro
const HOME_FEATURES = {
  mondrian: { planner: ["#1B1A17", "#fff"], mandalart: ["#E3B22E", "#1a1a1a"], pomodoro: ["#C7382E", "#fff"] },
  blue:     { planner: ["#1B1A17", "#fff"], mandalart: ["#2B3DCB", "#fff"],   pomodoro: ["#5B6BE0", "#fff"] },
  red:      { planner: ["#1B1A17", "#fff"], mandalart: ["#C7382E", "#fff"],   pomodoro: ["#E0655B", "#fff"] },
  green:    { planner: ["#1B1A17", "#fff"], mandalart: ["#1F7A4D", "#fff"],   pomodoro: ["#3CA86E", "#fff"] },
  yellow:   { planner: ["#1B1A17", "#fff"], mandalart: ["#E3B22E", "#1a1a1a"], pomodoro: ["#F0C95A", "#1a1a1a"] },
  bw:       { planner: ["#2C2C2A", "#fff"], mandalart: ["#6b6b68", "#fff"],   pomodoro: ["#9a9a96", "#1a1a1a"] },
};

// Per-theme "New Mandalart" button background (text is always dark #1a1a1a)
export const NEW_BTN_BG = {
  mondrian: "#E3B22E",
  blue:     "#dde0ff",
  red:      "#c4956a",
  green:    "#c4956a",
  yellow:   "#E3B22E",
  bw:       "#e4e4e0",
};

export function paletteFor(theme, dark) {
  const blocks = HOME_BLOCKS[theme] ?? HOME_BLOCKS.mondrian;
  return {
    bg: dark ? "#16150F" : "#F4F0E4",
    ink: dark ? "#F2EDE1" : "#1B1A17",
    accent: THEMES[theme].accents[0],
    accent2: THEMES[theme].accents[1],
    accent3: THEMES[theme].accents[2],
    homeTitleBg: blocks.title,
    homeManageBg: blocks.manage,
    homeFeatures: HOME_FEATURES[theme] ?? HOME_FEATURES.mondrian,
  };
}
