import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { safeLoad } from "js-yaml";
import { createCardElement } from "../../../src/panels/lovelace/create-element/create-card-element";

class DemoCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        .root {
          display: flex;
        }
        h2 {
          margin: 0 0 20px;
          color: var(--primary-color);
        }
        #card {
          max-width: 400px;
          width: 100vw;
        }
        pre {
          width: 400px;
          margin: 0 16px;
          overflow: auto;
          color: var(--primary-text-color);
        }
        @media only screen and (max-width: 800px) {
          .root {
            flex-direction: column;
          }
          pre {
            margin: 16px 0;
          }
        }
      </style>
      <h2>[[config.heading]]</h2>
      <div class="root">
        <div id="card"></div>
        <template is="dom-if" if="[[showConfig]]">
          <pre>[[_trim(config.config)]]</pre>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      config: {
        type: Object,
        observer: "_configChanged",
      },
      showConfig: Boolean,
    };
  }

  ready() {
    super.ready();
  }

  _configChanged(config) {
    const card = this.$.card;
    while (card.lastChild) {
      card.removeChild(card.lastChild);
    }

    const el = this._createCardElement(safeLoad(config.config)[0]);
    card.appendChild(el);
  }

  _createCardElement(cardConfig) {
    const element = createCardElement(cardConfig);
    if (this.hass) {
      element.hass = this.hass;
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(element, cardConfig);
      },
      { once: true }
    );
    return element;
  }

  _rebuildCard(cardElToReplace, config) {
    const newCardEl = this._createCardElement(config);
    cardElToReplace.parentElement.replaceChild(newCardEl, cardElToReplace);
  }

  _hassChanged(hass) {
    const card = this.$.card.lastChild;
    if (card) card.hass = hass;
  }

  _trim(config) {
    return config.trim();
  }
}

customElements.define("demo-card", DemoCard);
