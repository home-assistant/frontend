import {
  getAuth,
  createConnection,
  subscribeConfig,
  subscribeEntities,
  subscribeServices,
} from 'home-assistant-js-websocket';

import { loadTokens, saveTokens } from '../common/auth/token_storage.js';
import { subscribePanels } from '../data/ws-panels.js';
import { subscribeThemes } from '../data/ws-themes.js';
import { subscribeUser } from '../data/ws-user.js';

const hassUrl = `${location.protocol}//${location.host}`;

if (location.search.includes('external_auth=1')) {
  window.hassAuth = import('../common/auth/external_auth.js')
    .then(mod => new mod.default(hassUrl));
} else {
  window.hassAuth = getAuth({
    hassUrl,
    saveTokens,
    loadTokens: () => Promise.resolve(loadTokens()),
  });
}

window.hassConnection = window.hassAuth.then((auth) => {
  if (location.search.includes('auth_callback=1')) {
    history.replaceState(null, null, location.pathname);
  }
  return createConnection({ auth });
});

// Start fetching some of the data that we will need.
window.hassConnection.then((conn) => {
  const noop = () => {};
  subscribeEntities(conn, noop);
  subscribeConfig(conn, noop);
  subscribeServices(conn, noop);
  subscribePanels(conn, noop);
  subscribeThemes(conn, noop);
  subscribeUser(conn, noop);
});

window.addEventListener('error', (e) => {
  const homeAssistant = document.querySelector('home-assistant');
  if (homeAssistant && homeAssistant.hass && homeAssistant.hass.callService) {
    homeAssistant.hass.callService('system_log', 'write', {
      logger: `frontend.${__DEV__ ? 'js_dev' : 'js'}.${__BUILD__}.${__VERSION__.replace('.', '')}`,
      message: `${e.filename}:${e.lineno}:${e.colno} ${e.message}`,
    });
  }
});
