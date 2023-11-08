// Compat needs to be first import
import "../resources/compatibility";
import {
  Auth,
  Connection,
  createConnection,
  ERR_INVALID_AUTH,
  getAuth,
  subscribeConfig,
  subscribeEntities,
  subscribeServices,
} from "home-assistant-js-websocket";
import { loadTokens, saveTokens } from "../common/auth/token_storage";
import { hassUrl } from "../data/auth";
import { isExternal } from "../data/external";
import { getRecorderInfo } from "../data/recorder";
import { subscribeFrontendUserData } from "../data/frontend";
import { fetchConfig, fetchResources } from "../data/lovelace";
import { subscribePanels } from "../data/ws-panels";
import { subscribeThemes } from "../data/ws-themes";
import { subscribeRepairsIssueRegistry } from "../data/repairs";
import { subscribeUser } from "../data/ws-user";
import type { ExternalAuth } from "../external_app/external_auth";
import "../resources/array.flat.polyfill";
import "../resources/safari-14-attachshadow-patch";
import { MAIN_WINDOW_NAME } from "../data/main_window";
import { WindowWithPreloads } from "../data/preloads";

window.name = MAIN_WINDOW_NAME;
(window as any).frontendVersion = __VERSION__;

declare global {
  interface Window {
    hassConnection: Promise<{ auth: Auth; conn: Connection }>;
    hassConnectionReady?: (hassConnection: Window["hassConnection"]) => void;
  }
}

const clearUrlParams = () => {
  // Clear auth data from url if we have been able to establish a connection
  if (location.search.includes("auth_callback=1")) {
    const searchParams = new URLSearchParams(location.search);
    // https://github.com/home-assistant/home-assistant-js-websocket/blob/master/lib/auth.ts
    // Remove all data from QueryCallbackData type
    searchParams.delete("auth_callback");
    searchParams.delete("code");
    searchParams.delete("state");
    searchParams.delete("storeToken");
    const search = searchParams.toString();
    history.replaceState(
      null,
      "",
      `${location.pathname}${search ? `?${search}` : ""}`
    );
  }
};

const authProm = isExternal
  ? () =>
      import("../external_app/external_auth").then(({ createExternalAuth }) =>
        createExternalAuth(hassUrl)
      )
  : () =>
      getAuth({
        hassUrl,
        limitHassInstance: true,
        saveTokens,
        loadTokens: () => Promise.resolve(loadTokens()),
      });

const connProm = async (auth) => {
  try {
    const conn = await createConnection({ auth });
    clearUrlParams();
    return { auth, conn };
  } catch (err: any) {
    if (err !== ERR_INVALID_AUTH) {
      throw err;
    }
    // We can get invalid auth if auth tokens were stored that are no longer valid
    if (isExternal) {
      // Tell the external app to force refresh the access tokens.
      // This should trigger their unauthorized handling.
      await auth.refreshAccessToken(true);
    } else {
      // Clear stored tokens.
      saveTokens(null);
    }
    auth = await authProm();
    const conn = await createConnection({ auth });
    clearUrlParams();
    return { auth, conn };
  }
};

if (__DEV__ && "performance" in window) {
  // Remove adoptedStyleSheets so style inspector works on shadow DOM.
  // @ts-ignore
  delete Document.prototype.adoptedStyleSheets;
  performance.mark("hass-start");
}
window.hassConnection = (authProm() as Promise<Auth | ExternalAuth>).then(
  connProm
);

// This is set if app was somehow loaded before core.
if (window.hassConnectionReady) {
  window.hassConnectionReady(window.hassConnection);
}

// Start fetching some of the data that we will need.
window.hassConnection.then(({ conn }) => {
  const noop = () => {
    // do nothing
  };
  subscribeEntities(conn, noop);
  subscribeConfig(conn, noop);
  subscribeServices(conn, noop);
  subscribePanels(conn, noop);
  subscribeThemes(conn, noop);
  subscribeUser(conn, noop);
  subscribeFrontendUserData(conn, "core", noop);
  subscribeRepairsIssueRegistry(conn, noop);

  const preloadWindow = window as WindowWithPreloads;
  preloadWindow.recorderInfoProm = getRecorderInfo(conn);

  if (location.pathname === "/" || location.pathname.startsWith("/lovelace/")) {
    preloadWindow.llConfProm = fetchConfig(conn, null, false);
    preloadWindow.llConfProm.catch(() => {
      // Ignore it, it is handled by Lovelace panel.
    });
    preloadWindow.llResProm = fetchResources(conn);
  }
});
