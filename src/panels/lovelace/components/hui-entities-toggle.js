import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import canToggleState from '../../../common/entity/can_toggle_state.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import { STATES_ON } from '../../../common/const.js';

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
    <template is="dom-if" if="[[_toggleEntities]]">
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

  _computeToggleEntities(hass, entities) {
    return entities.filter((entity) => {
      return entity in hass.states ? canToggleState(hass, hass.states[entity]) : false;
    })
  }

  _computeIsChecked(hass, entities) {
    for (let i = 0; i < entities.length; i++) {
      if (STATES_ON.includes(hass.states[entities[i]].state)) return true;
    }
    return false;
  }

  _callService(ev) {
    const turnOn = ev.target.checked;

    this.entities.forEach((entity) => {
      if ((STATES_ON.includes(this.hass.states[entity].state)) !== turnOn) {
        const stateDomain = computeDomain(entity);
        let serviceDomain = stateDomain;
        let service;

        switch (stateDomain) {
          case 'lock':
            service = turnOn ? 'unlock' : 'lock';
            break;
          case 'cover':
            service = turnOn ? 'open_cover' : 'close_cover';
            break;
          case 'group':
            serviceDomain = 'homeassistant';
            service = turnOn ? 'turn_on' : 'turn_off';
            break;
          default:
            service = turnOn ? 'turn_on' : 'turn_off';
        }

        this.hass.callService(
          serviceDomain,
          service,
          { entity_id: entity }
        );
      }
    });
  }
}

customElements.define('hui-entities-toggle', HuiEntitiesToggle);
