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
  document.location.href = `/auth/authorize?response_type=code&client_id=${encodeURIComponent(clientId())}&redirect_uri=${encodeURIComponent(location.toString())}`;
  return new Promise();
}

let tokenCache;

function storeTokens(tokens) {
  tokenCache = tokens;
  try {
    localStorage.tokens = JSON.stringify(tokens);
  } catch (err) {}  // eslint-disable-line
}

function loadTokens() {
  if (tokenCache === undefined) {
    try {
      const tokens = localStorage.tokens;
      tokenCache = tokens ? JSON.parse(tokens) : null;
    } catch (err) {
      tokenCache = null;
    }
  }
  return tokenCache;
}

window.refreshToken = () => {
  const tokens = loadTokens();

  if (tokens === null) {
    return redirectLogin();
  }

  return refreshToken_(clientId(), tokens.refresh_token).then((accessTokenResp) => {
    const newTokens = Object.assign({}, tokens, accessTokenResp);
    storeTokens(newTokens);
    return newTokens;
  }, () => redirectLogin());
};

function resolveCode(code) {
  fetchToken(clientId(), code).then((tokens) => {
    storeTokens(tokens);
    // Refresh the page and have tokens in place.
    document.location.href = location.pathname;
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
  const tokens = loadTokens();

  if (tokens == null) {
    redirectLogin();
    return;
  }

  if (Date.now() + 30000 > tokens.expires) {
    // refresh access token if it will expire in 30 seconds to avoid invalid auth event
    window.hassConnection = window.refreshToken().then(newTokens => init(null, newTokens));
    return;
  }

  window.hassConnection = init(null, tokens).catch((err) => {
    if (err !== ERR_INVALID_AUTH) throw err;

    return window.refreshToken().then(newTokens => init(null, newTokens));
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
