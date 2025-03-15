import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { HomeAssistant, ThemeSettings } from "../types";
import {
  fetchFrontendUserData,
  saveFrontendUserData,
  subscribeFrontendUserData,
} from "./frontend";

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

export const SELECTED_THEME_KEY = "selectedTheme";

export const saveSelectedTheme = (hass: HomeAssistant, data?: ThemeSettings) =>
  saveFrontendUserData(hass.connection, SELECTED_THEME_KEY, data);

export const subscribeSelectedTheme = (
  hass: HomeAssistant,
  callback: (selectedTheme?: ThemeSettings | null) => void
) => subscribeFrontendUserData(hass.connection, SELECTED_THEME_KEY, callback);

export const fetchSelectedTheme = (hass: HomeAssistant) =>
  fetchFrontendUserData(hass.connection, SELECTED_THEME_KEY);
