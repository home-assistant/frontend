import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../components/ha-card.js';

import { STATES_ON } from '../../common/const.js';
import computeDomain from '../../common/entity/compute_domain.js';
import computeStateDisplay from '../../common/entity/compute_state_display.js';
import computeStateName from '../../common/entity/compute_state_name.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';

const DOMAINS_NO_STATE = ['scene', 'script', 'weblink'];

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HuiPictureCard extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        ha-card {
          position: relative;
          cursor: pointer;
          min-height: 48px;
          line-height: 0;
        }
        img {
          width: 100%;
          height: auto;
          border-radius: 2px;
        }
        img.state-off {
          filter: grayscale(100%);
        }
        .text {
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
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
          display: flex;
          justify-content: space-between;
        }
        .text .title {
          font-weight: 500;
        }
        .error {
          background-color: red;
          color: white;
          text-align: center;
        }
      </style>

      <ha-card on-click="_cardClicked">
        <img class$="[[_computeClass(config.entity, hass.states)]]" src="[[config.image]]">
        <div class="text">
          <div class="title">[[_computeTitle(config.entity, hass.states)]]</div>
          <div>[[_computeState(config.entity, hass.states)]]</div>
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
      _error: String
    };
  }

  getCardSize() {
    return 3;
  }

  _configChanged(config) {
    if (config && config.entity && config.image) {
      this._error = null;
    } else {
      this._error = 'Error in card configuration.';
    }
  }

  _computeClass(entityId, states) {
    return DOMAINS_NO_STATE.includes(computeDomain(entityId)) ||
      STATES_ON.includes(states[entityId].state) ? '' : 'state-off';
  }

  _computeTitle(entityId, states) {
    return entityId && computeStateName(states[entityId]);
  }

  _computeState(entityId, states) {
    const domain = computeDomain(entityId);
    switch (domain) {
      case 'scene':
        return this.localize('ui.card.scene.activate');
      case 'script':
      return this.localize('ui.card.script.execute');
      case 'weblink':
        return 'Open';
      default:
        return computeStateDisplay(this.localize, states[entityId]);
    }
  }

  _cardClicked() {
    const entityId = this.config.entity;
    const domain = computeDomain(entityId);
    if (domain === 'weblink') {
      window.open(this.hass.states[entityId].state);
    } else {
      const isOn = STATES_ON.includes(this.hass.states[entityId].state);
      let service;
      switch (domain) {
        case 'lock':
          service = isOn ? 'unlock' : 'lock';
          break;
        case 'cover':
          service = isOn ? 'close' : 'open';
          break;
        default:
          service = isOn ? 'turn_off' : 'turn_on';
      }
      this.hass.callService(domain, service, { entity_id: entityId });
    }
  }
}

customElements.define('hui-picture-card', HuiPictureCard);
