import { storeTokens, loadTokens } from './token_storage.js';

function genClientId() {
  return `${location.protocol}//${location.host}/`;
}


export function redirectLogin() {
  document.location.href = `/auth/authorize?response_type=code&client_id=${encodeURIComponent(genClientId())}&redirect_uri=${encodeURIComponent(location.toString())}`;
  return new Promise((() => {}));
}


function fetchTokenRequest(code) {
  const data = new FormData();
  data.append('client_id', genClientId());
  data.append('grant_type', 'authorization_code');
  data.append('code', code);
  return fetch('/auth/token', {
    credentials: 'same-origin',
    method: 'POST',
    body: data,
  }).then((resp) => {
    if (!resp.ok) throw new Error('Unable to fetch tokens');
    return resp.json().then((tokens) => {
      tokens.expires = (tokens.expires_in * 1000) + Date.now();
      return tokens;
    });
  });
}

function refreshTokenRequest(tokens) {
  const data = new FormData();
  data.append('client_id', genClientId());
  data.append('grant_type', 'refresh_token');
  data.append('refresh_token', tokens.refresh_token);
  return fetch('/auth/token', {
    credentials: 'same-origin',
    method: 'POST',
    body: data,
  }).then((resp) => {
    if (!resp.ok) throw new Error('Unable to fetch tokens');
    return resp.json().then((newTokens) => {
      newTokens.expires = (newTokens.expires_in * 1000) + Date.now();
      return newTokens;
    });
  });
}

export function resolveCode(code) {
  return fetchTokenRequest(code).then((tokens) => {
    storeTokens(tokens);
    history.replaceState(null, null, location.pathname);
    return tokens;
  }, (err) => {
    // eslint-disable-next-line
    console.error('Resolve token failed', err);
    alert('Unable to fetch tokens');
    redirectLogin();
  });
}


export function refreshToken() {
  const tokens = loadTokens();

  if (tokens === null) {
    return redirectLogin();
  }

  return refreshTokenRequest(tokens).then((accessTokenResp) => {
    const newTokens = Object.assign({}, tokens, accessTokenResp);
    storeTokens(newTokens);
    return newTokens;
  }, () => redirectLogin());
}
