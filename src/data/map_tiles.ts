import type { Connection } from "home-assistant-js-websocket";
import { waitForMs } from "../common/util/wait";

export const MAP_TILES_PATH = "/api/map_tiles";

// Core rotates every 30 minutes and keeps two tokens live, so one handed out
// now is good for at least 30 more. Refreshing sooner leaves room for a slow
// or missed round trip.
const TOKEN_REFRESH_MS = 20 * 60 * 1000;

// Nothing loads without a token, so the first attempts are awaited - briefly,
// or a backend without the proxy would hold the map hostage. The rest retry in
// the background, for the window after a restart where the WebSocket is up but
// the handler is not registered yet.
const BLOCKING_DELAYS_MS = [0, 400, 1000];
const BACKGROUND_DELAYS_MS = [2000, 5000, 10000, 15000];

let token: string | undefined;
let refreshInterval: ReturnType<typeof setInterval> | undefined;
let watchingConnection = false;
let activeConnection: Connection | undefined;
let refreshing: Promise<void> | undefined;
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
  activeConnection = connection;

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

  if (!watchingConnection) {
    watchingConnection = true;
    // The interval does not fire while the process is suspended, so the token
    // can be stale before it comes round; reconnecting is the reliable signal.
    connection.addEventListener("ready", () => {
      fetchToken(connection).catch(() => {
        // Nothing to do; the interval keeps trying.
      });
    });
  }
};

/**
 * Forces a new token, for when the current one is refused. Deduplicated: a
 * refused map produces one of these per tile.
 */
export const refreshMapTilesToken = (): Promise<void> => {
  if (!activeConnection) {
    return Promise.resolve();
  }
  refreshing ??= fetchToken(activeConnection)
    .catch(() => {
      // Leave the old token in place; a reconnect or the interval retries.
    })
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
};

/** Leaflet bakes its URL template at layer creation, so it needs telling. */
export const subscribeMapTilesToken = (
  listener: (token: string) => void
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * MapLibre hands tile URLs to a worker, which has no document to resolve a
 * relative URL against, so the result has to be absolute.
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
