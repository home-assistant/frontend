import {
  ERR_INVALID_AUTH,
  createConnection,
  subscribeConfig,
  subscribeEntities,
} from 'home-assistant-js-websocket';

import { redirectLogin, resolveCode, refreshToken } from '../common/auth/token.js';
// import refreshToken_ from '../common/auth/refresh_token.js';
import parseQuery from '../common/util/parse_query.js';
import { loadTokens } from '../common/auth/token_storage.js';

const init = window.createHassConnection = function (password, accessToken) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${window.location.host}/api/websocket?${__BUILD__}`;
  const options = {
    setupRetry: 10,
  };
  if (password) {
    options.authToken = password;
  } else if (accessToken) {
    options.accessToken = accessToken.access_token;
    options.expires = accessToken.expires;
  }
  return createConnection(url, options)
    .then(function (conn) {
      subscribeEntities(conn);
      subscribeConfig(conn);
      return conn;
    });
};

function main() {
  if (location.search) {
    const query = parseQuery(location.search.substr(1));
    if (query.code) {
      window.hassConnection = resolveCode(query.code).then(newTokens => init(null, newTokens));
      return;
    }
  }
  const tokens = loadTokens();

  if (tokens == null) {
    redirectLogin();
    return;
  }

  if (Date.now() + 30000 > tokens.expires) {
    // refresh access token if it will expire in 30 seconds to avoid invalid auth event
    window.hassConnection = refreshToken().then(newTokens => init(null, newTokens));
    return;
  }

  window.hassConnection = init(null, tokens).catch((err) => {
    if (err !== ERR_INVALID_AUTH) throw err;

    return refreshToken().then(newTokens => init(null, newTokens));
  });
}

function mainLegacy() {
  if (window.noAuth === '1') {
    window.hassConnection = init();
  } else if (window.localStorage.authToken) {
    window.hassConnection = init(window.localStorage.authToken);
  } else {
    window.hassConnection = null;
  }
}

if (window.useOAuth === '1') {
  main();
} else {
  mainLegacy();
}

window.addEventListener('error', (e) => {
  const homeAssistant = document.querySelector('home-assistant');
  if (homeAssistant && homeAssistant.hass && homeAssistant.hass.callService) {
    homeAssistant.hass.callService('system_log', 'write', {
      logger: `frontend.${__DEV__ ? 'js_dev' : 'js'}.${__BUILD__}.${__VERSION__.replace('.', '')}`,
      message: `${e.filename}:${e.lineno}:${e.colno} ${e.message}`,
    });
  }
});
