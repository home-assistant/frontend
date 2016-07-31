import HomeAssistant from '../home-assistant-js/src/index';

const hass = new HomeAssistant();

window.validateAuth = function validateAuth(authToken, rememberAuth) {
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

hass.reactor.batch(function () {
  hass.navigationActions.showSidebar(
    hass.localStoragePreferences.showSidebar);

  // if auth was given, tell the backend
  if (window.noAuth) {
    window.validateAuth('', false);
  } else if (hass.localStoragePreferences.authToken) {
    window.validateAuth(hass.localStoragePreferences.authToken, true);
  }
});

setTimeout(hass.startLocalStoragePreferencesSync, 5000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service_worker.js');
  });
}

// While we figure out how ha-entity-marker can keep it's references
window.hass = hass;
