import { loadJS } from "../common/dom/load_resource";
import { loadCustomPanel } from "../util/custom-panel/load-custom-panel";
import { createCustomPanelElement } from "../util/custom-panel/create-custom-panel-element";
import { setCustomPanelProperties } from "../util/custom-panel/set-custom-panel-properties";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerElement } from "@polymer/polymer";
import { CustomPanelInfo } from "../data/panel_custom";
import { webComponentsSupported } from "../common/feature-detect/support-web-components";

declare global {
  interface Window {
    loadES5Adapter: () => Promise<unknown>;
  }
}

let es5Loaded: Promise<unknown> | undefined;

window.loadES5Adapter = () => {
  if (!es5Loaded) {
    es5Loaded = Promise.all([
      loadJS(
        `${__STATIC_PATH__}polyfills/custom-elements-es5-adapter.js`
      ).catch(),
      import(/* webpackChunkName: "compat" */ "./compatibility"),
    ]);
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

function initialize(panel: CustomPanelInfo, properties: {}) {
  const style = document.createElement("style");
  style.innerHTML = "body{margin:0}";
  document.head.appendChild(style);

  const config = panel.config._panel_custom;
  let start: Promise<unknown> = Promise.resolve();

  if (!webComponentsSupported) {
    start = start.then(() =>
      loadJS(`${__STATIC_PATH__}polyfills/webcomponents-bundle.js`)
    );
  }

  if (__BUILD__ === "es5") {
    // Load ES5 adapter. Swallow errors as it raises errors on old browsers.
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
              ev.detail ? ev.detail.replace : false
            );
          }
        });
        setProperties({ panel, ...properties });
        document.body.appendChild(panelEl!);
      },
      (err) => {
        // tslint:disable-next-line
        console.error(err, panel);
        alert(`Unable to load the panel source: ${err}.`);
      }
    );
}

document.addEventListener(
  "DOMContentLoaded",
  () => window.parent.customPanel!.registerIframe(initialize, setProperties),
  { once: true }
);
