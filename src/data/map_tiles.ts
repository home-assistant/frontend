import type { Connection } from "home-assistant-js-websocket";
import { waitForMs } from "../common/util/wait";

// The map tiles are proxied by core, which is what lets them be requested with
// an application User-Agent and without a referrer. That proxy is token gated.
export const MAP_TILES_PATH = "/api/map_tiles";

// Mirrors the brands token handling in util/brands-url.ts: refresh well within
// the token's lifetime so a dashboard left open for days keeps working.
const TOKEN_REFRESH_MS = 30 * 60 * 1000;

// Nothing on the map loads without a token, so the first attempts are awaited -
// but only briefly, or a backend without the proxy would hold the map hostage
// for half a minute. The rest ride through the window after a restart where the
// WebSocket server is up but the integration has not registered its handler
// yet, in the background: a late token still reaches the raster layer through
// `subscribeMapTilesToken`, and the next map to open.
const BLOCKING_DELAYS_MS = [0, 400, 1000];
const BACKGROUND_DELAYS_MS = [2000, 5000, 10000, 15000];

let token: string | undefined;
let refreshInterval: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<(token: string) => void>();

const fetchToken = async (connection: Connection): Promise<void> => {
  const result = await connection.sendMessagePromise<{ token: string }>({
    type: "map_tiles/access_token",
  });
  if (result.token !== token) {
    token = result.token;
    listeners.forEach((listener) => listener(token!));
  }
};

/**
 * Fetches a token if there is none yet and keeps it fresh for as long as a map
 * is on screen. Resolves once a token is available, or without one if the
 * backend does not have the proxy - callers fall back rather than fail.
 */
const attempt = async (connection: Connection, delays: number[]) => {
  /* eslint-disable no-await-in-loop -- retries are intentionally sequential */
  for (const delay of delays) {
    if (token) {
      return;
    }
    if (delay) {
      await waitForMs(delay);
    }
    try {
      await fetchToken(connection);
      return;
    } catch {
      // try next delay
    }
  }
  /* eslint-enable no-await-in-loop */
};

export const ensureMapTilesToken = async (
  connection: Connection
): Promise<string | undefined> => {
  if (!token) {
    await attempt(connection, BLOCKING_DELAYS_MS);
  }

  if (!token) {
    attempt(connection, BACKGROUND_DELAYS_MS).then(() =>
      scheduleRefresh(connection)
    );
    return undefined;
  }

  scheduleRefresh(connection);
  return token;
};

const scheduleRefresh = (connection: Connection) => {
  if (token && !refreshInterval) {
    refreshInterval = setInterval(() => {
      fetchToken(connection).catch(() => {
        // Keep the current token; the next interval retries.
      });
    }, TOKEN_REFRESH_MS);
  }
};

/** Leaflet bakes its URL template at layer creation, so it needs telling. */
export const subscribeMapTilesToken = (
  listener: (token: string) => void
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Resolves a URL against the current page and adds the token if it points at
 * the proxy. MapLibre hands tile URLs to a worker, which has no document to
 * resolve a relative URL against, so this has to produce an absolute one.
 */
export const withMapTilesToken = (url: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(url, location.href);
  } catch {
    return url;
  }

  if (token && parsed.pathname.startsWith(`${MAP_TILES_PATH}/`)) {
    parsed.searchParams.set("token", token);
  }

  return parsed.href;
};
