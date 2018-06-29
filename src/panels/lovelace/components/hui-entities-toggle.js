import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import canToggleState from '../../../common/entity/can_toggle_state.js';
import turnOnOffEntities from '../common/entity/turn-on-off-entities.js'
import { STATES_OFF } from '../../../common/const.js';

class HuiEntitiesToggle extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        width: 38px;
        display: block;
      }
      paper-toggle-button {
        cursor: pointer;
        --paper-toggle-button-label-spacing: 0;
        padding: 13px 5px;
        margin: -4px -5px;
      }
    </style>
    <template is="dom-if" if="[[_toggleEntities.length]]">
      <paper-toggle-button checked="[[_computeIsChecked(hass, _toggleEntities)]]" on-change="_callService"></paper-toggle-button>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      entities: Array,
      _toggleEntities: {
        type: Array,
        computed: '_computeToggleEntities(hass, entities)'
      }
    };
  }

  _computeToggleEntities(hass, entityIds) {
    return entityIds.filter(entityId => (entityId in hass.states ?
      canToggleState(hass, hass.states[entityId]) : false));
  }

  _computeIsChecked(hass, entityIds) {
    return entityIds.some(entityId => !STATES_OFF.includes(hass.states[entityId].state));
  }

  _callService(ev) {
    const turnOn = ev.target.checked;
    turnOnOffEntities(hass, this._toggleEntities, turnOn);
  }
}

customElements.define('hui-entities-toggle', HuiEntitiesToggle);
