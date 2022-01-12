import { Connection, createCollection } from "home-assistant-js-websocket";

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
  default_dark_theme: string | null;
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
