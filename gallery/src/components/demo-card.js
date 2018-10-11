import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import JsYaml from "js-yaml";

import HomeAssistant from "../data/hass.js";
import demoConfig from "../data/demo_config.js";
import demoResources from "../data/demo_resources.js";
import demoStates from "../data/demo_states.js";
import createCardElement from "../../../src/panels/lovelace/common/create-card-element.js";

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
      <div class='root'>
        <div id="card"></div>
        <template is='dom-if' if='[[showConfig]]'>
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

    const el = createCardElement(JsYaml.safeLoad(config.config)[0]);

    if (this.hass) {
      el.hass = this.hass;
    } else {
      const hass = new HomeAssistant(demoStates);
      hass.config = demoConfig;
      hass.resources = demoResources;
      hass.language = "en";
      hass.states = demoStates;
      el.hass = hass;
    }

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
