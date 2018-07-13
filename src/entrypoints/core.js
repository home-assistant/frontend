import {
  ERR_INVALID_AUTH,
  createConnection,
  subscribeConfig,
  subscribeEntities,
} from 'home-assistant-js-websocket';

import fetchToken from '../common/auth/fetch_token.js';
import refreshToken_ from '../common/auth/refresh_token.js';
import parseQuery from '../common/util/parse_query.js';

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

function clientId() {
  return `${location.protocol}//${location.host}/`;
}

function redirectLogin() {
  document.location = `${__PUBLIC_PATH__}authorize.html?response_type=code&client_id=${encodeURIComponent(clientId())}&redirect_uri=${encodeURIComponent(location.toString())}`;
}

window.refreshToken = () =>
  refreshToken_(clientId(), window.tokens.refresh_token).then((accessTokenResp) => {
    window.tokens.access_token = accessTokenResp.access_token;
    // shorten access token life 30 seconds to cover network cost
    window.tokens.expires = ((accessTokenResp.expires_in - 30) * 1000) + Date.now();
    localStorage.tokens = JSON.stringify(window.tokens);
    return {
      access_token: accessTokenResp.access_token,
      expires: window.tokens.expires
    };
  }, () => redirectLogin());

function resolveCode(code) {
  fetchToken(clientId(), code).then((tokens) => {
    // shorten access token life 30 seconds to cover network cost
    tokens.expires = ((tokens.expires_in - 30) * 1000) + Date.now();
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
    if (window.tokens.expires === undefined) {
      window.tokens.expires = Date.now() - 1;
    }
    if (Date.now() > window.tokens.expires) {
      // refresh access token if we know it expires to reduce unncessary backend invalid auth event
      window.hassConnection = window.refreshToken().then(accessToken => init(null, accessToken));
    } else {
      const accessTokenObject = {
        access_token: window.tokens.access_token,
        expires: window.tokens.expires
      };
      window.hassConnection = init(null, accessTokenObject).catch((err) => {
        if (err !== ERR_INVALID_AUTH) throw err;

        return window.refreshToken().then(accessToken => init(null, accessToken));
      });
    }
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
