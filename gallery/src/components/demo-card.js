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
          display: flex;
          flex-wrap: wrap;
          background-color: #fafafa;
        }
        div {
          flex-basis: 600px;
          padding: 8px 8px 32px 8px;
        }
        h2 {
          margin: 0;
          color: #03a9f4;
        }
        hui-glance-card {
          margin-left: 20px;
          margin-top: 20px;
        }
      </style>
      <div id="root"></div>
    `;
  }

  static get properties() {
    return {
      type: String,
      configs: {
        type: Object,
        observer: '_configsChanged'
      }
    };
  }

  _configsChanged(configs) {
    const root = this.$.root;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const hass = new HomeAssistant();
    hass.states = demoStates;

    configs.forEach((item) => {
      const container = document.createElement('div');
      const heading = document.createElement('h2');
      heading.innerText = item.heading;
      container.appendChild(heading);
      const el = document.createElement(this.type);
      el.setConfig(JsYaml.safeLoad(item.config));
      el.hass = hass;
      container.appendChild(el);
      const yaml = document.createElement('pre');
      yaml.innerText = item.config;
      container.appendChild(yaml);
      root.appendChild(container);
    });
  }
}

customElements.define('demo-card', DemoCard);
