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
import { subscribeFrontendUserData } from "../data/frontend";
import {
  fetchConfig,
  fetchResources,
  WindowWithLovelaceProm,
} from "../data/lovelace";
import { subscribePanels } from "../data/ws-panels";
import { subscribeThemes } from "../data/ws-themes";
import { subscribeUser } from "../data/ws-user";
import type { ExternalAuth } from "../external_app/external_auth";
import "../resources/safari-14-attachshadow-patch";
import { HomeAssistant } from "../types";

declare global {
  interface Window {
    hassConnection: Promise<{ auth: Auth; conn: Connection }>;
    hassConnectionReady?: (hassConnection: Window["hassConnection"]) => void;
  }
}

const authProm = isExternal
  ? () =>
      import("../external_app/external_auth").then(({ createExternalAuth }) =>
        createExternalAuth(hassUrl)
      )
  : () =>
      getAuth({
        hassUrl,
        saveTokens,
        loadTokens: () => Promise.resolve(loadTokens()),
      });

const connProm = async (auth) => {
  try {
    const conn = await createConnection({ auth });
    // Clear auth data from url if we have been able to establish a connection
    if (location.search.includes("auth_callback=1")) {
      const searchParams = new URLSearchParams(location.search);
      // https://github.com/home-assistant/home-assistant-js-websocket/blob/master/lib/auth.ts
      // Remove all data from QueryCallbackData type
      searchParams.delete("auth_callback");
      searchParams.delete("code");
      searchParams.delete("state");
      history.replaceState(
        null,
        "",
        `${location.pathname}?${searchParams.toString()}`
      );
    }

    return { auth, conn };
  } catch (err) {
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
    return { auth, conn };
  }
};

if (__DEV__) {
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

  if (location.pathname === "/" || location.pathname.startsWith("/lovelace/")) {
    const llWindow = window as WindowWithLovelaceProm;
    llWindow.llConfProm = fetchConfig(conn, null, false);
    llWindow.llConfProm.catch(() => {
      // Ignore it, it is handled by Lovelace panel.
    });
    llWindow.llResProm = fetchResources(conn);
  }
});

window.addEventListener("error", (e) => {
  if (!__DEV__ && e.message === "ResizeObserver loop limit exceeded") {
    e.stopImmediatePropagation();
    e.stopPropagation();
    return;
  }
  const homeAssistant = document.querySelector("home-assistant") as any;
  if (
    homeAssistant &&
    homeAssistant.hass &&
    (homeAssistant.hass as HomeAssistant).callService
  ) {
    homeAssistant.hass.callService("system_log", "write", {
      logger: `frontend.${
        __DEV__ ? "js_dev" : "js"
      }.${__BUILD__}.${__VERSION__.replace(".", "")}`,
      message: `${e.filename}:${e.lineno}:${e.colno} ${e.message}`,
    });
  }
});
