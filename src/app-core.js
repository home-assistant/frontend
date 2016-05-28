import moment from 'moment';

import HomeAssistant from 'home-assistant-js';

window.moment = moment;

// While we figure out how ha-entity-marker can keep it's references
window.hass = new HomeAssistant();

window.validateAuth = function validateAuth(hass, authToken, rememberAuth) {
  hass.authActions.validate(authToken, {
    rememberAuth,
    useStreaming: hass.localStoragePreferences.useStreaming,
  });
};

window.removeInitMsg = function removeInitMessage() {
  // remove the HTML init message
  const initMsg = document.getElementById('ha-init-skeleton');
  if (initMsg) {
    initMsg.parentElement.removeChild(initMsg);
  }
};
