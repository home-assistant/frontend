import { HomeAssistant } from "../types";

const STORED_STATE = [
  "dockedSidebar",
  "selectedTheme",
  "selectedLanguage",
  "vibrate",
  "debugConnection",
  "suspendWhenHidden",
  "enableShortcuts",
  "defaultPanel",
];
const STORAGE = window.localStorage || {};

export function storeState(hass: HomeAssistant) {
  try {
    STORED_STATE.forEach((key) => {
      const value = hass[key];
      STORAGE[key] = JSON.stringify(value === undefined ? null : value);
    });
  } catch (err: any) {
    // Safari throws exception in private mode
  }
}

export function getState() {
  const state = {};

  STORED_STATE.forEach((key) => {
    if (key in STORAGE) {
      let value = JSON.parse(STORAGE[key]);
      // selectedTheme went from string to object on 20200718
      if (key === "selectedTheme" && typeof value === "string") {
        value = { theme: value };
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
