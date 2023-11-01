// Compat needs to be first import
import "../resources/compatibility";
import "../resources/safari-14-attachshadow-patch";

import { PolymerElement } from "@polymer/polymer";
import { CSSResult } from "lit";
import { fireEvent } from "../common/dom/fire_event";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { loadJS } from "../common/dom/load_resource";
import { webComponentsSupported } from "../common/feature-detect/support-web-components";
import { navigate } from "../common/navigate";
import { CustomPanelInfo } from "../data/panel_custom";
import { baseEntrypointStyles } from "../resources/styles";
import { createCustomPanelElement } from "../util/custom-panel/create-custom-panel-element";
import { loadCustomPanel } from "../util/custom-panel/load-custom-panel";
import { setCustomPanelProperties } from "../util/custom-panel/set-custom-panel-properties";

import("@polymer/polymer/lib/utils/settings").then(
  ({ setCancelSyntheticClickEvents }) => setCancelSyntheticClickEvents(false)
);

declare global {
  interface Window {
    loadES5Adapter: () => Promise<unknown>;
  }
}

let es5Loaded: Promise<unknown> | undefined;

window.loadES5Adapter = () => {
  if (!es5Loaded) {
    es5Loaded = loadJS(
      `${__STATIC_PATH__}polyfills/custom-elements-es5-adapter.js`
    ).catch(); // Swallow errors as it raises errors on old browsers.
  }
  return es5Loaded;
};

let panelEl: HTMLElement | PolymerElement | undefined;

function setProperties(properties) {
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
  let start: Promise<unknown> = Promise.resolve();

  if (!webComponentsSupported) {
    start = start.then(() =>
      loadJS(`${__STATIC_PATH__}polyfills/webcomponents-bundle.js`)
    );
  }

  if (__BUILD__ === "es5") {
    start = start.then(() => window.loadES5Adapter());
  }

  start
    .then(() => loadCustomPanel(config))
    // If our element is using es5, let it finish loading that and define element
    // This avoids elements getting upgraded after being added to the DOM
    .then(() => es5Loaded || Promise.resolve())
    .then(
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
          errorScreen = document.createElement(
            "supervisor-error-screen"
          ) as any;
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

document.addEventListener(
  "DOMContentLoaded",
  () => window.parent.customPanel!.registerIframe(initialize, setProperties),
  { once: true }
);

window.addEventListener("unload", () => {
  // allow disconnected callback to fire
  while (document.body.lastChild) {
    document.body.removeChild(document.body.lastChild);
  }
});
