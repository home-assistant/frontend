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

/**
 * Which light/dark modes a theme can be shown in.
 * - `both`: the user can pick light, dark or auto.
 * - `light` / `dark`: the theme only defines that mode and always uses it.
 * - `none`: the theme has no modes and fixed colors. It is applied on the light base.
 */
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

/**
 * The variables a theme sets for the given mode, with the mode specific
 * variables taking precedence over the base ones.
 */
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

/**
 * Whether the theme sets a color itself, so a color picked by the user must
 * not override it. A theme that sets any key of the generated primary palette
 * also counts as setting the primary color.
 */
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

/** Whether the theme sets any key of the generated primary palette. */
export const themeDefinesPrimaryPalette = (
  themeVariables: Partial<ThemeVars>
): boolean =>
  Object.keys(themeVariables).some((key) =>
    key.startsWith("ha-color-primary-")
  );
