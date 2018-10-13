import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import computeCardSize from "../common/compute-card-size.js";
import createCardElement from "../common/create-card-element.js";

class HuiHorizontalStackCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          display: flex;
        }
        #root > * {
          flex: 1 1 0;
          margin: 0 4px;
          min-width: 0;
        }
        #root > *:first-child {
          margin-left: 0;
        }
        #root > *:last-child {
          margin-right: 0;
        }
      </style>
      <div id="root"></div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
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
    let size = 1;
    this._elements.forEach((element) => {
      const elSize = computeCardSize(element);
      if (elSize > size) size = elSize;
    });
    return size;
  }

  setConfig(config) {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect.");
    }
    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;
    this._elements = [];
    const root = this.$.root;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const elements = [];
    config.cards.forEach((card) => {
      const element = createCardElement(card);
      element.hass = this.hass;
      elements.push(element);
      root.appendChild(element);
    });
    this._elements = elements;
  }

  _hassChanged(hass) {
    this._elements.forEach((element) => {
      element.hass = hass;
    });
  }
}

customElements.define("hui-horizontal-stack-card", HuiHorizontalStackCard);
