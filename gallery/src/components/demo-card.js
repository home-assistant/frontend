import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import JsYaml from 'js-yaml';

import HomeAssistant from '../data/hass.js';
import demoStates from '../data/demo_dump.js';
import createCardElement from '../../../src/panels/lovelace/common/create-card-element.js';

class DemoCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        .root {
          display: flex;
        }
        h2 {
          margin: 0;
          color: var(--primary-color);
          margin-bottom: 20px;
        }
        #card {
          max-width: 400px;
        }
        pre {
          margin-left: 16px;
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
      config: {
        type: Object,
        observer: '_configChanged'
      },
      showConfig: Boolean,
    };
  }

  _configChanged(config) {
    const card = this.$.card;
    while (card.lastChild) {
      card.removeChild(card.lastChild);
    }

    const hass = new HomeAssistant();
    hass.states = demoStates;

    const el = createCardElement(JsYaml.safeLoad(config.config)[0]);
    el.hass = hass;
    card.appendChild(el);
  }

  _trim(config) {
    return config.trim();
  }
}

customElements.define('demo-card', DemoCard);
