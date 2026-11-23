import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";

export interface ThemeVars {
  // Incomplete
  "primary-color": string;
  "text-primary-color": string;
  "accent-color": string;
  [key: string]: string;
}

export type Theme = ThemeVars & {
  modes?: {
    light?: ThemeVars;
    dark?: ThemeVars;
  };
};

export interface Themes {
  default_theme: string;
  default_dark_theme?: string | null;
  themes: Record<string, Theme>;
  // Currently effective dark mode. Will never be undefined. If user selected "auto"
  // in theme picker, this property will still contain either true or false based on
  // what has been determined via system preferences and support from the selected theme.
  darkMode: boolean;
  // Currently globally active theme name
  theme: string;
}

const fetchThemes = (conn) =>
  conn.sendMessagePromise({
    type: "frontend/get_themes",
  });

const subscribeUpdates = (conn, store) =>
  conn.subscribeEvents(
    () => fetchThemes(conn).then((data) => store.setState(data, true)),
    "themes_updated"
  );

export const subscribeThemes = (
  conn: Connection,
  onChange: (themes: Themes) => void
) =>
  createCollection<Themes>(
    "_thm",
    fetchThemes,
    subscribeUpdates,
    conn,
    onChange
  );

/** `none`: the theme has no modes and fixed colors, applied on the light base. */
export type ThemeModeSupport = "both" | "light" | "dark" | "none";

export const getThemeModeSupport = (theme: Theme): ThemeModeSupport => {
  const modes = theme.modes;
  const hasLight = !!modes && "light" in modes;
  const hasDark = !!modes && "dark" in modes;
  if (hasLight && hasDark) {
    return "both";
  }
  if (hasDark) {
    return "dark";
  }
  if (hasLight) {
    return "light";
  }
  return "none";
};

export const getThemeVariables = (
  theme: Theme,
  darkMode: boolean
): Partial<ThemeVars> => {
  const { modes, ...baseVariables } = theme;
  return {
    ...baseVariables,
    ...(darkMode ? modes?.dark : modes?.light),
  };
};

/** Setting any primary palette key counts as setting the primary color. */
export const themeDefinesColor = (
  themeVariables: Partial<ThemeVars>,
  color: "primary" | "accent"
): boolean => {
  if (color === "accent") {
    return "accent-color" in themeVariables;
  }
  return (
    "primary-color" in themeVariables ||
    themeDefinesPrimaryPalette(themeVariables)
  );
};

export const themeDefinesPrimaryPalette = (
  themeVariables: Partial<ThemeVars>
): boolean =>
  Object.keys(themeVariables).some((key) =>
    key.startsWith("ha-color-primary-")
  );
