import { Connection, createCollection } from "home-assistant-js-websocket";

export interface ThemeVars {
  // Incomplete
  "primary-color": string;
  "text-primary-color": string;
  "accent-color": string;
  [key: string]: string;
}

export type Theme = ThemeVars & {
  styles?: ThemeVars;
  dark_styles?: ThemeVars;
};

export interface Themes {
  default_theme: string;
  default_dark_theme: string | null;
  themes: Record<string, Theme>;
  // Currently effective dark mode.
  darkMode: boolean;
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
