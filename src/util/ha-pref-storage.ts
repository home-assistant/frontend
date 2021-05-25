import { HomeAssistant } from "../types";

const STORED_STATE = [
  "dockedSidebar",
  "selectedThemeSettings",
  "selectedLanguage",
  "vibrate",
  "suspendWhenHidden",
  "enableShortcuts",
  "defaultPanel",
];
// Deprecated states will be loaded once so that the values can be migrated to other states if required,
// but during the next state storing, the deprecated keys will be removed.
const STORED_STATE_DEPRECATED = ["selectedTheme"];
const STORAGE = window.localStorage || {};

export function storeState(hass: HomeAssistant) {
  try {
    STORED_STATE.forEach((key) => {
      const value = hass[key];
      STORAGE[key] = JSON.stringify(value === undefined ? null : value);
    });
    STORED_STATE_DEPRECATED.forEach((key) => {
      if (key in STORAGE) delete STORAGE[key];
    });
  } catch (err) {
    // Safari throws exception in private mode
  }
}

export function getState() {
  const state = {};

  STORED_STATE.concat(STORED_STATE_DEPRECATED).forEach((key) => {
    if (key in STORAGE) {
      let value = JSON.parse(STORAGE[key]);
      // selectedTheme went from string to object on 20200718
      if (key === "selectedTheme" && typeof value === "string") {
        value = { theme: value };
      }
      // selectedTheme was renamed to selectedThemeSettings on 20210207
      if (key === "selectedTheme") {
        key = "selectedThemeSettings";
      }
      // dockedSidebar went from boolean to enum on 20190720
      if (key === "dockedSidebar" && typeof value === "boolean") {
        value = value ? "docked" : "auto";
      }
      state[key] = value;
    }
  });
  return state;
}

export function clearState() {
  // STORAGE is an object if localStorage not available.
  if (STORAGE.clear) {
    STORAGE.clear();
  }
}
