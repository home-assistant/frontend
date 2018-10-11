import {
  getAuth,
  createConnection,
  subscribeConfig,
  subscribeEntities,
  subscribeServices,
  ERR_INVALID_AUTH,
} from "home-assistant-js-websocket";

import { loadTokens, saveTokens } from "../common/auth/token_storage.js";
import { subscribePanels } from "../data/ws-panels.js";
import { subscribeThemes } from "../data/ws-themes.js";
import { subscribeUser } from "../data/ws-user.js";

const hassUrl = `${location.protocol}//${location.host}`;
const isExternal = location.search.includes("external_auth=1");

const authProm = isExternal
  ? () =>
      import("../common/auth/external_auth.js").then(
        (mod) => new mod.default(hassUrl)
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

    // Clear url if we have been able to establish a connection
    if (location.search.includes("auth_callback=1")) {
      history.replaceState(null, null, location.pathname);
    }

    return { auth, conn };
  } catch (err) {
    if (err !== ERR_INVALID_AUTH) {
      throw err;
    }
    // We can get invalid auth if auth tokens were stored that are no longer valid
    // Clear stored tokens.
    if (!isExternal) saveTokens(null);
    auth = await authProm();
    const conn = await createConnection({ auth });
    return { auth, conn };
  }
};

window.hassConnection = authProm().then(connProm);

// Start fetching some of the data that we will need.
window.hassConnection.then(({ conn }) => {
  const noop = () => {};
  subscribeEntities(conn, noop);
  subscribeConfig(conn, noop);
  subscribeServices(conn, noop);
  subscribePanels(conn, noop);
  subscribeThemes(conn, noop);
  subscribeUser(conn, noop);
});

window.addEventListener("error", (e) => {
  const homeAssistant = document.querySelector("home-assistant");
  if (homeAssistant && homeAssistant.hass && homeAssistant.hass.callService) {
    homeAssistant.hass.callService("system_log", "write", {
      logger: `frontend.${
        __DEV__ ? "js_dev" : "js"
      }.${__BUILD__}.${__VERSION__.replace(".", "")}`,
      message: `${e.filename}:${e.lineno}:${e.colno} ${e.message}`,
    });
  }
});
