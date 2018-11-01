import { loadJS } from "../common/dom/load_resource";
import loadCustomPanel from "../util/custom-panel/load-custom-panel";
import createCustomPanelElement from "../util/custom-panel/create-custom-panel-element";
import setCustomPanelProperties from "../util/custom-panel/set-custom-panel-properties";

const webComponentsSupported =
  "customElements" in window &&
  "import" in document.createElement("link") &&
  "content" in document.createElement("template");

let es5Loaded = null;

window.loadES5Adapter = () => {
  if (!es5Loaded) {
    es5Loaded = Promise.all([
      loadJS(`${__STATIC_PATH__}custom-elements-es5-adapter`).catch(),
      import(/* webpackChunkName: "compat" */ "./compatibility"),
    ]);
  }
  return es5Loaded;
};

let root = null;

function setProperties(properties) {
  if (root === null) return;
  setCustomPanelProperties(root, properties);
}

function initialize(panel, properties) {
  const style = document.createElement("style");
  style.innerHTML = "body{margin:0}";
  document.head.appendChild(style);

  const config = panel.config._panel_custom;
  let start = Promise.resolve();

  if (!webComponentsSupported) {
    start = start.then(() => loadJS("/static/webcomponents-bundle"));
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
        root = createCustomPanelElement(config);

        const forwardEvent = (ev) =>
          window.parent.customPanel.fire(ev.type, ev.detail);
        root.addEventListener("hass-open-menu", forwardEvent);
        root.addEventListener("hass-close-menu", forwardEvent);
        root.addEventListener("location-changed", () =>
          window.parent.customPanel.navigate(window.location.pathname)
        );
        setProperties(Object.assign({ panel }, properties));
        document.body.appendChild(root);
      },
      (err) => {
        // eslint-disable-next-line
        console.error(err, panel);
        alert(`Unable to load the panel source: ${err}.`);
      }
    );
}

document.addEventListener(
  "DOMContentLoaded",
  () => window.parent.customPanel.registerIframe(initialize, setProperties),
  { once: true }
);
