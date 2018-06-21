import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import '../../components/ha-card.js';

import { STATES_ON } from '../../common/const.js';
import computeDomain from '../../common/entity/compute_domain.js';
import computeStateDisplay from '../../common/entity/compute_state_display.js';
import computeStateName from '../../common/entity/compute_state_name.js';
import stateIcon from '../../common/entity/state_icon.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';

const DOMAIN_SENSORS = ['binary_sensor', 'device_tracker', 'sensor'];

/*
 * @appliesMixin LocalizeMixin
 */
class HuiGlanceToggleCard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          min-height: 48px;
          line-height: 0;
        }
        img {
          width: 100%;
          height: auto;
          border-radius: 2px;
        }
        .box {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 16px;
          font-size: 16px;
          line-height: 40px;
          color: white;
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
          display: flex;
          justify-content: space-between;
        }
        .box .title {
          font-weight: 500;
        }
        paper-icon-button, iron-icon {
          color: #A9A9A9;
        }
        paper-icon-button.state-on, iron-icon.state-on {
          color: white;
        }
        iron-icon {
          padding: 8px;
        }
        .error {
          background-color: red;
          color: white;
          text-align: center;
        }
      </style>

      <ha-card>
        <img src="[[config.image]]">
        <div class="box">
          <div class="title">[[config.title]]</div>
          <div>
            <template is="dom-repeat" items="[[_entities]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <template is="dom-if" if="[[_hasService(item)]]">
                  <paper-icon-button
                    on-click="_callService"
                    class$="[[_computeClass(item, hass.states)]]"
                    icon="[[_computeIcon(item, hass.states)]]"
                    title="[[_computeTooltip(item, hass.states)]]"
                  ></paper-icon-button>
                </template>
                <template is="dom-if" if="[[!_hasService(item)]]">
                  <iron-icon
                    class$="[[_computeClass(item, hass.states)]]"
                    icon="[[_computeIcon(item, hass.states)]]"
                    title="[[_computeTooltip(item, hass.states)]]"
                  ></iron-icon>
                </template>
              </template>
            </template>
          </div>
        </div>
        <template is="dom-if" if="[[_error]]">
          <div class="error">[[_error]]</div>
        </template>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      config: Object,
      _entities: {
        type: Array,
        computed: '_computeEntities(config)'
      },
      _error: String
    };
  }

  getCardSize() {
    return 3;
  }

  _computeEntities(config) {
    if (config && config.entities && Array.isArray(config.entities) && config.image) {
      this._error = null;
      return config.entities;
    }
    this._error = 'Error in card configuration.';
    return [];
  }

  _showEntity(entityId, states) {
    return entityId in states;
  }

  _hasService(entityId) {
    return !DOMAIN_SENSORS.includes(computeDomain(entityId));
  }

  _computeIcon(entityId, states) {
    return stateIcon(states[entityId]);
  }

  _computeClass(entityId, states) {
    return STATES_ON.includes(states[entityId].state) ? 'state-on': '';
  }

  _computeTooltip(entityId, states) {
    return `${computeStateName(states[entityId])}: ${computeStateDisplay(this.localize, states[entityId])}`;
  }

  _callService(ev) {
    const entityId = ev.model.item;
    const domain = computeDomain(entityId);
    const isOn = STATES_ON.includes(this.hass.states[entityId].state);
    switch (domain) {
      case 'lock':
        service = isOn ? 'unlock' : 'lock';
        break;
      case 'cover':
        service = isOn ? 'close' : 'open';
        break;
      case 'scene':
        service = 'turn_on';
        break;
      default:
        service = isOn ? 'turn_off' : 'turn_on';
    }
    this.hass.callService(domain, service, { entity_id: entityId });
  }
}

customElements.define('hui-glance-toggle-card', HuiGlanceToggleCard);
