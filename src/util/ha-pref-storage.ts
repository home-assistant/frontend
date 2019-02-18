import { HomeAssistant } from "../types";

const STORED_STATE = ["dockedSidebar", "selectedTheme"];
const STORAGE = window.localStorage || {};

export function storeState(hass: HomeAssistant) {
  try {
    for (const key of STORED_STATE) {
      const value = hass[key];
      STORAGE[key] = JSON.stringify(value === undefined ? null : value);
    }
  } catch (err) {
    // Safari throws exception in private mode
  }
}

export function getState() {
  const state = {};

  for (const key of STORED_STATE) {
    if (key in STORAGE) {
      state[key] = JSON.parse(STORAGE[key]);
    }
  }

  return state;
}

export function clearState() {
  // STORAGE is an object if localStorage not available.
  if (STORAGE.clear) {
    STORAGE.clear();
  }
}
