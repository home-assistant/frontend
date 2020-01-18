import { html } from "@polymer/polymer/lib/utils/html-tag";
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
          width: 400px;
        }
        pre {
          width: 400px;
          margin: 16px;
          overflow: auto;
        }
        @media only screen and (max-width: 800px) {
          .root {
            flex-direction: column;
          }
          pre {
            margin-left: 0;
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

  _configChanged(config) {
    const card = this.$.card;
    while (card.lastChild) {
      card.removeChild(card.lastChild);
    }

    const el = createCardElement(safeLoad(config.config)[0]);
    el.hass = this.hass;
    card.appendChild(el);
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
