import {
  getAuth,
  createConnection,
  subscribeConfig,
  subscribeEntities,
  subscribeServices,
  ERR_INVALID_AUTH,
  Auth,
  Connection,
} from "home-assistant-js-websocket";

import { loadTokens, saveTokens } from "../common/auth/token_storage";
import { subscribePanels } from "../data/ws-panels";
import { subscribeThemes } from "../data/ws-themes";
import { subscribeUser } from "../data/ws-user";
import { HomeAssistant } from "../types";
import { hassUrl } from "../data/auth";
import { fetchConfig, WindowWithLovelaceProm } from "../data/lovelace";
import { subscribeFrontendUserData } from "../data/frontend";

declare global {
  interface Window {
    hassConnection: Promise<{ auth: Auth; conn: Connection }>;
  }
}

const isExternal =
  window.externalApp ||
  window.webkit?.messageHandlers?.getExternalAuth ||
  location.search.includes("external_auth=1");

const authProm = isExternal
  ? () =>
      import(
        /* webpackChunkName: "external_auth" */ "../external_app/external_auth"
      ).then(({ createExternalAuth }) => createExternalAuth(hassUrl))
  : () =>
      getAuth({
        hassUrl,
        saveTokens,
        loadTokens: () => Promise.resolve(loadTokens()),
      });

const connProm = async (auth) => {
  try {
    const conn = await createConnection({ auth });

    // Clear url if we have been able to establish a connection
    if (location.search.includes("auth_callback=1")) {
      history.replaceState(null, "", location.pathname);
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
window.hassConnection = authProm().then(connProm);

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
    (window as WindowWithLovelaceProm).llConfProm = fetchConfig(conn, false);
  }
});

window.addEventListener("error", (e) => {
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
