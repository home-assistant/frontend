import type { Connection } from "home-assistant-js-websocket";
import type { CSSResult } from "lit";
import { fireEvent } from "../common/dom/fire_event";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { navigate } from "../common/navigate";
import type { CustomPanelInfo } from "../data/panel_custom";
import { baseEntrypointStyles } from "../resources/styles";
import { createCustomPanelElement } from "../util/custom-panel/create-custom-panel-element";
import { dropRealmCollections } from "../util/custom-panel/drop-realm-collections";
import { loadCustomPanel } from "../util/custom-panel/load-custom-panel";
import { setCustomPanelProperties } from "../util/custom-panel/set-custom-panel-properties";

let panelEl: HTMLElement | undefined;
let initialized = false;
// Kept so we can clean up after ourselves on pagehide without depending on
// `window.parent.customPanel`, which `_cleanupPanel()` may already have deleted.
let connection: Connection | undefined;

function setProperties(properties) {
  if (properties.hass?.connection) {
    connection = properties.hass.connection;
  }
  if (!panelEl) {
    return;
  }
  setCustomPanelProperties(panelEl, properties);
}

function initialize(
  panel: CustomPanelInfo,
  properties: Record<string, unknown>
) {
  const style = document.createElement("style");

  style.innerHTML = `
  body {
    margin:0;
    background-color: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
  }
  @media (prefers-color-scheme: dark) {
    body {
      background-color: var(--primary-background-color, #111111);
      color: var(--primary-text-color, #e1e1e1);
    }
  }`;
  document.head.appendChild(style);

  const config = panel.config._panel_custom;

  loadCustomPanel(config).then(
    () => {
      panelEl = createCustomPanelElement(config);

      const forwardEvent = (ev) => {
        if (window.parent.customPanel) {
          fireEvent(window.parent.customPanel, ev.type, ev.detail);
        }
      };
      panelEl!.addEventListener("hass-toggle-menu", forwardEvent);
      window.addEventListener("location-changed", (ev: any) => {
        if (window.parent.customPanel) {
          window.parent.customPanel.navigate(
            window.location.pathname,
            ev.detail
          );
        }
      });
      setProperties({ panel, ...properties });
      document.body.appendChild(panelEl!);
    },
    (err) => {
      // eslint-disable-next-line
      console.error(err, panel);
      let errorScreen;
      if (panel.url_path === "hassio") {
        import("../layouts/supervisor-error-screen");
        errorScreen = document.createElement("supervisor-error-screen") as any;
      } else {
        import("../layouts/hass-error-screen");
        errorScreen = document.createElement("hass-error-screen") as any;
        errorScreen.error = `Unable to load the panel source: ${err}.`;
      }

      const errorStyle = document.createElement("style");
      errorStyle.innerHTML = (baseEntrypointStyles as CSSResult).cssText;
      document.body.appendChild(errorStyle);

      errorScreen.hass = properties.hass;
      document.body.appendChild(errorScreen);
    }
  );

  document.body.addEventListener("click", (ev) => {
    const href = isNavigationClick(ev);
    if (href) {
      navigate(href);
    }
  });
}

function handleReady() {
  if (initialized) return;
  initialized = true;
  window.parent.customPanel!.registerIframe(initialize, setProperties);
}

// Initial load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", handleReady, { once: true });
} else {
  handleReady();
}

window.addEventListener("pageshow", handleReady);

window.addEventListener("pagehide", () => {
  initialized = false;
  // allow disconnected callback to fire
  while (document.body.lastChild) {
    document.body.removeChild(document.body.lastChild);
  }
  // The connection is owned by the main window and outlives this realm, so any
  // collection we created on it has to go with us.
  if (connection) {
    dropRealmCollections(connection);
  }
});
