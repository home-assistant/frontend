import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import createHuiElement from "../common/create-hui-element.js";

class HuiPictureElementsCard extends PolymerElement {
  static get template() {
    return html`
    <style>
      ha-card {
        overflow: hidden;
      }
      #root {
        position: relative;
        overflow: hidden;
      }
      #root img {
        display: block;
        width: 100%;
      }
      .element {
        position: absolute;
        transform: translate(-50%, -50%);
      }
    </style>

    <ha-card header="[[_config.title]]">
      <div id="root"></div>
    </ha-card>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      _config: Object,
    };
  }

  constructor() {
    super();
    this._elements = [];
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  getCardSize() {
    return 4;
  }

  setConfig(config) {
    if (!config || !config.image || !Array.isArray(config.elements)) {
      throw new Error("Invalid card configuration");
    }

    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;
    const root = this.$.root;
    this._elements = [];

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const img = document.createElement("img");
    img.src = config.image;
    root.appendChild(img);

    config.elements.forEach((element) => {
      const el = createHuiElement(element);
      el.hass = this.hass;
      this._elements.push(el);

      el.classList.add("element");
      Object.keys(element.style).forEach((prop) => {
        el.style.setProperty(prop, element.style[prop]);
      });
      root.appendChild(el);
    });

    if (this.hass) {
      this._hassChanged(this.hass);
    }
  }

  _hassChanged(hass) {
    this._elements.forEach((element) => {
      element.hass = hass;
    });
  }
}

customElements.define("hui-picture-elements-card", HuiPictureElementsCard);
