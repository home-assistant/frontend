import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-error-card.js';
import '../../../components/ha-card.js';

import { STATES_OFF } from '../../../common/const.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateDomain from '../../../common/entity/compute_state_domain.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import createErrorCardConfig from '../common/create-error-card-config.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

const OFFLINE = 'Offline';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiPictureEntityCard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }
        img {
          display: block;
          width: 100%;
          height: auto;
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
          line-height: 16px;
          color: white;
          display: flex;
          justify-content: space-between;
        }
        #title {
          font-weight: 500;
        }
      </style>

      <ha-card on-click="_cardClicked">
        <img id="image" src="">
        <div class="box">
          <div id="title"></div>
          <div id="state"></div>
        </div>
        <template is="dom-if" if="[[_error]]">
          <hui-error-card config="[[_error]]"></hui-error-card>
        </template>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      config: {
        type: Object,
        observer: '_configChanged'
      },
      _error: Object
    };
  }

  getCardSize() {
    return 3;
  }

  _configChanged(config) {
    if (!config || !config.entity || (!config.image && !config.state_image)) {
      const error = 'Error in card configuration.';
      this._error = createErrorCardConfig(error, config);
      return;
    }
    this._error = null;
  }

  _hassChanged(hass) {
    const config = this.config;
    const entityId = config && config.entity;
    if (!entityId) {
      return;
    }
    if (!(entityId in hass.states) && this._oldState === OFFLINE) {
      return;
    }
    if (!(entityId in hass.states) || hass.states[entityId].state !== this._oldState) {
      this._updateState(hass, entityId, config);
    }
  }

  _updateState(hass, entityId, config) {
    const state = entityId in hass.states ? hass.states[entityId].state : OFFLINE;
    const stateImg = config.state_image &&
      (config.state_image[state] || config.state_image.default);

    this.$.image.src = stateImg || config.image;
    this.$.image.style.filter = stateImg || (!STATES_OFF.includes(state) && state !== OFFLINE) ?
      '' : 'grayscale(100%)';
    this.$.title.innerText = config.title || (state === OFFLINE ?
      entityId : computeStateName(hass.states[entityId]));
    this.$.state.innerText = state === OFFLINE ?
      OFFLINE : this._computeState(hass.states[entityId]);
    this._oldState = state;
  }

  _computeState(stateObj) {
    const domain = computeStateDomain(stateObj);
    switch (domain) {
      case 'scene':
        return this.localize('ui.card.scene.activate');
      case 'script':
        return this.localize('ui.card.script.execute');
      case 'weblink':
        return 'Open';
      default:
        return computeStateDisplay(this.localize, stateObj);
    }
  }

  _cardClicked() {
    const entityId = this.config && this.config.entity;
    if (!(entityId in this.hass.states)) {
      return;
    }

    const stateDomain = computeDomain(entityId);
    if (stateDomain === 'weblink') {
      window.open(this.hass.states[entityId].state);
    } else {
      const turnOn = STATES_OFF.includes(this.hass.states[entityId].state);
      let service;
      switch (stateDomain) {
        case 'lock':
          service = turnOn ? 'unlock' : 'lock';
          break;
        case 'cover':
          service = turnOn ? 'open_cover' : 'close_cover';
          break;
        default:
          service = turnOn ? 'turn_on' : 'turn_off';
      }
      const serviceDomain = stateDomain === 'group' ? 'homeassistant' : stateDomain;
      this.hass.callService(serviceDomain, service, { entity_id: entityId });
    }
  }
}

customElements.define('hui-picture-entity-card', HuiPictureEntityCard);
