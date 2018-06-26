import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import '../../../components/ha-card.js';

import { STATES_ON } from '../../../common/const.js';
import canToggleState from '../../../common/entity/can_toggle_state.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import stateIcon from '../../../common/entity/state_icon.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiPictureGlanceCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
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
          padding: 4px 16px;
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
            <template is="dom-repeat" items="[[_entitiesDialog]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <paper-icon-button
                  on-click="_openDialog"
                  class$="[[_computeClass(item, hass.states)]]"
                  icon="[[_computeIcon(item, hass.states)]]"
                  title="[[_computeTooltip(item, hass.states)]]"
                ></paper-icon-button>
              </template>
            </template>
          </div>
          <div>
            <template is="dom-repeat" items="[[_entitiesService]]">
              <template is="dom-if" if="[[_showEntity(item, hass.states)]]">
                <paper-icon-button
                  on-click="_callService"
                  class$="[[_computeClass(item, hass.states)]]"
                  icon="[[_computeIcon(item, hass.states)]]"
                  title="[[_computeTooltip(item, hass.states)]]"
                ></paper-icon-button>
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
      config: {
        type: Object,
        observer: '_configChanged'
      },
      _entitiesDialog: Array,
      _entitiesService: Array,
      _error: String
    };
  }

  getCardSize() {
    return 3;
  }

  _configChanged(config) {
    let dialog = [];
    let service = [];
    let _error = null;
    if (config && config.entities && Array.isArray(config.entities) && config.image) {
      if (config.force_dialog) {
        dialog = config.entities;
      } else {
        service = config.entities.filter(entity => canToggleState(this.hass, this.hass.states[entity]));
        dialog = config.entities.filter(entity => !service.includes(entity));
      }
    } else {
      _error = 'Error in card configuration.';
    }
    this.setProperties({
      _entitiesDialog: dialog,
      _entitiesService: service,
      _error
    });
  }

  _showEntity(entityId, states) {
    return entityId in states;
  }

  _computeIcon(entityId, states) {
    return stateIcon(states[entityId]);
  }

  _computeClass(entityId, states) {
    return STATES_ON.includes(states[entityId].state) ? 'state-on' : '';
  }

  _computeTooltip(entityId, states) {
    return `${computeStateName(states[entityId])}: ${computeStateDisplay(this.localize, states[entityId])}`;
  }

  _openDialog(ev) {
    this.fire('hass-more-info', { entityId: ev.model.item });
  }

  _callService(ev) {
    const entityId = ev.model.item;
    const domain = computeDomain(entityId);
    const turnOn = !STATES_ON.includes(this.hass.states[entityId].state);
    let service;
    switch (domain) {
      case 'lock':
        service = turnOn ? 'unlock' : 'lock';
        break;
      case 'cover':
        service = turnOn ? 'open_cover' : 'close_cover';
        break;
      case 'group':
        domain = 'homeassistant';
        service = turnOn ? 'turn_on' : 'turn_off';
        break;
      default:
        service = turnOn ? 'turn_on' : 'turn_off';
    }
    this.hass.callService(domain, service, { entity_id: entityId });
  }
}

customElements.define('hui-picture-glance-card', HuiPictureGlanceCard);
