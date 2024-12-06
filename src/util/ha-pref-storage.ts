import { FallbackStorage } from "../../test/test_helper/local-storage-fallback";
import type { HomeAssistant } from "../types";

const storage = window.localStorage || new FallbackStorage();

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

export function storeState(hass: HomeAssistant) {
  try {
    STORED_STATE.forEach((key) => {
      const value = hass[key];
      storage.setItem(key, JSON.stringify(value === undefined ? null : value));
    });
  } catch (err: any) {
    // Safari throws exception in private mode
    // eslint-disable-next-line no-console
    console.warn(
      "Cannot store state; Are you in private mode or is your storage full?"
    );
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export function getState() {
  const state = {};

  STORED_STATE.forEach((key) => {
    const storageItem = storage.getItem(key);
    if (storageItem !== null) {
      let value = JSON.parse(storageItem);
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
  storage.clear();
}
