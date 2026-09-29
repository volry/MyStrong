/**
 * Colour theme, chosen per device: it has to apply before sign-in (the login
 * screen) and before any data loads. `index.html` applies the saved choice
 * before the first paint; this module changes it and follows the system.
 */
export const THEME_PREFS = ["system", "dark", "light"] as const;
export type ThemePref = (typeof THEME_PREFS)[number];

const KEY = "mystrong:theme";
const BAR = { dark: "#17191c", light: "#f3f4f5" } as const;

export function getThemePref(): ThemePref {
  try {
    const saved = localStorage.getItem(KEY);
    if ((THEME_PREFS as readonly string[]).includes(saved ?? "")) return saved as ThemePref;
  } catch {
    // storage is optional
  }
  return "dark";
}

function resolve(pref: ThemePref): "dark" | "light" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const theme = resolve(pref);
  const root = document.documentElement;
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR[theme]);
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute("content", theme === "light" ? "default" : "black-translucent");
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // storage is optional; the choice still applies until the app closes
  }
  applyTheme(pref);
}

/** Keep "system" in step when the phone switches between light and dark. */
export function followSystemTheme() {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const update = () => {
    if (getThemePref() === "system") applyTheme("system");
  };
  media.addEventListener("change", update);
}
