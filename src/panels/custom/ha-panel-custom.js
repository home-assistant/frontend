import { PolymerElement } from "@polymer/polymer/polymer-element";

import EventsMixin from "../../mixins/events-mixin";
import NavigateMixin from "../../mixins/navigate-mixin";
import loadCustomPanel from "../../util/custom-panel/load-custom-panel";
import createCustomPanelElement from "../../util/custom-panel/create-custom-panel-element";
import setCustomPanelProperties from "../../util/custom-panel/set-custom-panel-properties";

/*
 * Mixins are used by ifram to communicate with main frontend.
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
class HaPanelCustom extends NavigateMixin(EventsMixin(PolymerElement)) {
  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      route: Object,
      panel: {
        type: Object,
        observer: "_panelChanged",
      },
    };
  }

  static get observers() {
    return ["_dataChanged(hass, narrow, showMenu, route)"];
  }

  constructor() {
    super();
    this._setProperties = null;
  }

  _panelChanged(panel) {
    // Clean up
    delete window.customPanel;
    this._setProperties = null;
    while (this.lastChild) {
      this.remove(this.lastChild);
    }

    const config = panel.config._panel_custom;

    const tempA = document.createElement("a");
    tempA.href = config.html_url || config.js_url || config.module_url;

    if (
      !config.trust_external &&
      !["localhost", "127.0.0.1", location.hostname].includes(tempA.hostname)
    ) {
      if (
        !confirm(`Do you trust the external panel "${config.name}" at "${
          tempA.href
        }"?

It will have access to all data in Home Assistant.

(Check docs for the panel_custom component to hide this message)`)
      ) {
        return;
      }
    }

    if (!config.embed_iframe) {
      loadCustomPanel(config).then(
        () => {
          const element = createCustomPanelElement(config);
          this._setProperties = (props) =>
            setCustomPanelProperties(element, props);
          setCustomPanelProperties(element, {
            panel,
            hass: this.hass,
            narrow: this.narrow,
            showMenu: this.showMenu,
            route: this.route,
          });
          this.appendChild(element);
        },
        () => {
          alert(`Unable to load custom panel from ${tempA.href}`);
        }
      );
      return;
    }

    window.customPanel = this;
    this.innerHTML = `
    <style>
      iframe {
        border: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
    <iframe></iframe>
    `;
    const iframeDoc = this.querySelector("iframe").contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`<script src='${window.customPanelJS}'></script>`);
    iframeDoc.close();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    delete window.customPanel;
  }

  _dataChanged(hass, narrow, showMenu, route) {
    if (!this._setProperties) return;
    this._setProperties({ hass, narrow, showMenu, route });
  }

  registerIframe(initialize, setProperties) {
    initialize(this.panel, {
      hass: this.hass,
      narrow: this.narrow,
      showMenu: this.showMenu,
      route: this.route,
    });
    this._setProperties = setProperties;
  }
}

customElements.define("ha-panel-custom", HaPanelCustom);
