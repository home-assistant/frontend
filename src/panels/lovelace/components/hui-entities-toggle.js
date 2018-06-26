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

  _computeToggleEntities(hass, entities) {
    return entities.filter(entity => (entity in hass.states ?
      canToggleState(hass, hass.states[entity]) : false));
  }

  _computeIsChecked(hass, entities) {
    return entities.some(ent_id => STATES_ON.includes(hass.states[ent_id].state));
  }

  _callService(ev) {
    const turnOn = ev.target.checked;
    const toCall = {};

    this.entities.forEach((ent_id) => {
      if ((STATES_ON.includes(this.hass.states[ent_id].state)) !== turnOn) {
        const stateDomain = computeDomain(ent_id);
        const serviceDomain = stateDomain === 'lock' || stateDomain === 'cover' ?
          stateDomain : 'homeassistant';

        if (!(serviceDomain in toCall)) toCall[serviceDomain] = [];
        toCall[serviceDomain].push(ent_id);
      }
    });

    Object.keys(toCall).forEach((domain) => {
      let service;
      switch (domain) {
        case 'lock':
          service = turnOn ? 'unlock' : 'lock';
          break;
        case 'cover':
          service = turnOn ? 'open_cover' : 'close_cover';
          break;
        default:
          service = turnOn ? 'turn_on' : 'turn_off';
      }

      const entities = toCall[domain];
      this.hass.callService(domain, service, { entity_id: entities });
    });
  }
}

customElements.define('hui-entities-toggle', HuiEntitiesToggle);
