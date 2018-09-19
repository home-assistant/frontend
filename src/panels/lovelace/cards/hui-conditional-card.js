import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeCardSize from '../common/compute-card-size.js';
import createCardElement from '../common/create-card-element.js';

class HuiConditionalCard extends PolymerElement {
  static get template() {
    return html`
      <style>
        .hidden {
          display: none;
        }
      </style>
      <div id="card"></div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged',
      },
      _config: Object
    };
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  setConfig(config) {
    if (!config || !config.card || !Array.isArray(config.conditions)
        || !config.conditions.every(c => c.entity && (c.state || c.state_not))) {
      throw new Error('Error in card configuration.');
    }

    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;
    const root = this.$.card;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const element = createCardElement(config.card);
    element.hass = this.hass;
    root.appendChild(element);
    if (this.hass) this._hassChanged(this.hass);
  }

  getCardSize() {
    const el = this.$.card && this.$.card.lastChild;
    return el ? computeCardSize(el) : 1;
  }

  _hassChanged(hass) {
    const root = this.$.card;
    if (!root || !root.lastChild) return;

    root.lastChild.hass = hass;

    const conditions = this._config.conditions;
    const visible = conditions.every((c) => {
      if (c.entity in hass.states) {
        if (c.state) return hass.states[c.entity].state === c.state;
        return hass.states[c.entity].state !== c.state_not;
      }
      return false;
    });
    root.classList.toggle('hidden', !visible);
  }
}
customElements.define('hui-conditional-card', HuiConditionalCard);
