import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-input/paper-input.js';

import '../components/hui-generic-entity-row.js';

class HuiInputTextEntityRow extends PolymerElement {
  static get template() {
    return html`
      <template is="dom-if" if="[[_stateObj]]">
        <hui-generic-entity-row
          hass="[[hass]]"
          config="[[_config]]"
        >
        <paper-input no-label-float=
          minlength="[[_stateObj.attributes.min]]"
          maxlength="[[_stateObj.attributes.max]]"
          value="{{_value}}"
          auto-validate="[[_stateObj.attributes.pattern]]"
          pattern="[[_stateObj.attributes.pattern]]"
          type="[[_stateObj.attributes.mode]]"
          on-change="_selectedValueChanged"
          on-click="_stopPropagation"
          placeholder="(empty value)"
        ></hui-generic-entity-row>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)'
      },
      _value: String
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  getCardSize() {
    return 1;
  }

  _stopPropagation(ev) {
    ev.stopPropagation();
  }

  _selectedValueChanged() {
    if (this._value === this._stateObj.state) {
      return;
    }
    this.hass.callService('input_text', 'set_value', {
      value: this._value,
      entity_id: this._stateObj.entity_id,
    });
  }
}
customElements.define('hui-input-text-entity-row', HuiInputTextEntityRow);
