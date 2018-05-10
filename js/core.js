import * as HAWS from 'home-assistant-js-websocket';

import fetchToken from './common/auth/fetch_token.js';
import refreshToken_ from './common/auth/refresh_token.js';
import parseQuery from './common/util/parse_query.js';

window.HAWS = HAWS;
window.HASS_DEMO = __DEMO__;
window.HASS_DEV = __DEV__;
window.HASS_BUILD = __BUILD__;
window.HASS_VERSION = __VERSION__;

const init = window.createHassConnection = function (password, accessToken) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${window.location.host}/api/websocket?${window.HASS_BUILD}`;
  const options = {
    setupRetry: 10,
  };
  if (password) {
    options.authToken = password;
  } else if (accessToken) {
    options.accessToken = accessToken;
  }
  return HAWS.createConnection(url, options)
    .then(function (conn) {
      HAWS.subscribeEntities(conn);
      HAWS.subscribeConfig(conn);
      return conn;
    });
};

function redirectLogin() {
  const urlBase = __DEV__ ? '/home-assistant-polymer/src' : `/frontend_${__BUILD__}`;
  document.location = `${urlBase}/authorize.html?response_type=code&client_id=${window.clientId}&redirect_uri=/`;
}

window.refreshToken = () =>
  refreshToken_(window.clientId, window.tokens.refresh_token).then((accessTokenResp) => {
    window.tokens.access_token = accessTokenResp.access_token;
    localStorage.tokens = JSON.stringify(window.tokens);
    return accessTokenResp.access_token;
  }, () => redirectLogin());

function resolveCode(code) {
  fetchToken(window.clientId, code).then((tokens) => {
    localStorage.tokens = JSON.stringify(tokens);
    // Refresh the page and have tokens in place.
    document.location = location.pathname;
  }, (err) => {
    // eslint-disable-next-line
    console.error('Resolve token failed', err);
    alert('Unable to fetch tokens');
    redirectLogin();
  });
}

function main() {
  if (location.search) {
    const query = parseQuery(location.search.substr(1));
    if (query.code) {
      resolveCode(query.code);
      return;
    }
  }
  if (localStorage.tokens) {
    window.tokens = JSON.parse(localStorage.tokens);
    window.hassConnection = init(null, window.tokens.access_token).catch((err) => {
      if (err !== HAWS.ERR_INVALID_AUTH) throw err;

      return window.refreshToken().then(accessToken => init(null, accessToken));
    });
    return;
  }
  redirectLogin();
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

if (window.clientId) {
  main();
} else {
  mainLegacy();
}

window.addEventListener('error', (e) => {
  const homeAssistant = document.querySelector('home-assistant');
  if (homeAssistant && homeAssistant.hass && homeAssistant.hass.callService) {
    homeAssistant.hass.callService('system_log', 'write', {
      logger: `frontend.${window.HASS_DEV ? 'js_dev' : 'js'}.${window.HASS_BUILD}.${window.HASS_VERSION.replace('.', '')}`,
      message: `${e.filename}:${e.lineno}:${e.colno} ${e.message}`,
    });
  }
});
