import { AuthData } from "home-assistant-js-websocket";
import { extractSearchParam } from "../url/search-params";

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
    writeEnabled: undefined,
  };
}

export function askWrite() {
  return (
    tokenCache.tokens !== undefined && tokenCache.writeEnabled === undefined
  );
}

export function saveTokens(tokens: AuthData | null) {
  tokenCache.tokens = tokens;

  if (!tokenCache.writeEnabled && extractSearchParam("storeToken") === "true") {
    tokenCache.writeEnabled = true;
  }

  if (tokenCache.writeEnabled) {
    try {
      storage.hassTokens = JSON.stringify(tokens);
    } catch (err: any) {
      // write failed, ignore it. Happens if storage is full or private mode.
    }
  }
}

export function enableWrite() {
  tokenCache.writeEnabled = true;
  if (tokenCache.tokens) {
    saveTokens(tokenCache.tokens);
  }
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
