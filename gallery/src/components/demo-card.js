import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import JsYaml from 'js-yaml';

import '../../../src/panels/lovelace/cards/hui-glance-card.js';
import '../../../src/panels/lovelace/cards/hui-picture-entity-card.js';
import '../../../src/panels/lovelace/cards/hui-picture-glance-card.js';

import HomeAssistant from '../data/hass.js';
import demoStates from '../data/demo_dump.js';

class DemoCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        #root {
          padding: 8px 8px 32px 8px;
        }
        h2 {
          margin: 0;
          color: var(--primary-color);
          margin-bottom: 20px;
        }
      </style>
      <div id="root"></div>
    `;
  }

  static get properties() {
    return {
      type: String,
      config: {
        type: Object,
        observer: '_configChanged'
      }
    };
  }

  _configChanged(config) {
    const root = this.$.root;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const hass = new HomeAssistant();
    hass.states = demoStates;

    const heading = document.createElement('h2');
    heading.innerText = config.heading;
    root.appendChild(heading);
    const el = document.createElement(this.type);
    el.setConfig(JsYaml.safeLoad(config.config)[0]);
    el.hass = hass;
    root.appendChild(el);
    const yaml = document.createElement('pre');
    yaml.innerText = config.config.trim();
    root.appendChild(yaml);
  }
}

customElements.define('demo-card', DemoCard);
