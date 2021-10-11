import { AuthData } from "home-assistant-js-websocket";

const storage = window.localStorage || {};

declare global {
  interface Window {
    __tokenCache: {
      // undefined: we haven't loaded yet
      // null: none stored
      tokens?: AuthData | null;
      writeEnabled?: boolean;
    };
  }
}

// So that core.js and main app hit same shared object.
let tokenCache = window.__tokenCache;
if (!tokenCache) {
  tokenCache = window.__tokenCache = {
    tokens: undefined,
  };
}

export function askWrite() {
  return tokenCache.tokens !== undefined && storage.getItem("keepSignedIn");
}

export function saveTokens(tokens: AuthData | null) {
  tokenCache.tokens = tokens;
  if (storage.getItem("keepSignedIn")) {
    try {
      storage.hassTokens = JSON.stringify(tokens);
    } catch (err: any) {
      // write failed, ignore it. Happens if storage is full or private mode.
    }
  }
}

export function enableWrite() {
  storage.setItem("keepSignedIn", "true");
  if (tokenCache.tokens) {
    saveTokens(tokenCache.tokens);
  }
}

export function disableWrite() {
  storage.removeItem("keepSignedIn");
}

export function loadTokens() {
  if (tokenCache.tokens === undefined) {
    try {
      // Delete the old token cache.
      delete storage.tokens;
      const tokens = storage.hassTokens;
      if (tokens) {
        tokenCache.tokens = JSON.parse(tokens);
        tokenCache.writeEnabled = true;
      } else {
        tokenCache.tokens = null;
      }
    } catch (err: any) {
      tokenCache.tokens = null;
    }
  }
  return tokenCache.tokens;
}
