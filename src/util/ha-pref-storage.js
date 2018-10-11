const STORED_STATE = ["dockedSidebar", "selectedTheme", "selectedLanguage"];
const STORAGE = window.localStorage || {};

export function storeState(hass) {
  try {
    for (var i = 0; i < STORED_STATE.length; i++) {
      var key = STORED_STATE[i];
      var value = hass[key];
      STORAGE[key] = JSON.stringify(value === undefined ? null : value);
    }
  } catch (err) {
    // Safari throws exception in private mode
  }
}

export function getState() {
  var state = {};

  for (var i = 0; i < STORED_STATE.length; i++) {
    var key = STORED_STATE[i];
    if (key in STORAGE) {
      state[key] = JSON.parse(STORAGE[key]);
    }
  }

  return state;
}

export function clearState() {
  // STORAGE is an object if localStorage not available.
  if (STORAGE.clear) STORAGE.clear();
}
