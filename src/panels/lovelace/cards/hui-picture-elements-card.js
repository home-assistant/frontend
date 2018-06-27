import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';
import '../../../components/entity/state-badge.js';
import '../../../components/ha-card.js';

import { STATES_ON } from '../../../common/const.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class HuiPictureElementsCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      ha-card {
        overflow: hidden;
      }
      #root {
        position: relative;
        overflow: hidden;
      }
      #root img {
        display: block;
        width: 100%;
      }
      .element {
        white-space: nowrap;
        position: absolute;
        transform: translate(-50%, -50%);
      }
      .state-text {
        padding: 8px;
      }
      .clickable {
        cursor: pointer;
      }
      ha-call-service-button {
        color: var(--primary-color);
      }
    </style>

    <ha-card header="[[config.title]]">
      <div id="root"></div>
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
      }
    };
  }

  getCardSize() {
    return 4;
  }

  _configChanged(config) {
    const root = this.$.root;
    this._requiresStateObj = [];
    this._requiresTextState = [];

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (config && config.image && config.elements) {
      const img = document.createElement('img');
      img.src = config.image;
      root.appendChild(img);

      config.elements.forEach((element) => {
        let el;
        if (element.type === 'state-badge') {
          const entityId = element.entity;
          el = document.createElement('state-badge');
          el.addEventListener('click', () => this._handleClick(entityId, element.action === 'toggle'));
          el.classList.add('clickable');
          this._requiresStateObj.push({ el, entityId });
        } else if (element.type === 'state-text') {
          const entityId = element.entity;
          el = document.createElement('div');
          el.addEventListener('click', () => this._handleClick(entityId, false));
          el.classList.add('clickable', 'state-text');
          this._requiresTextState.push({ el, entityId });
        } else if (element.type === 'service-button') {
          el = document.createElement('ha-call-service-button');
          el.hass = this.hass;
          el.domain = (element.service && element.domain) || 'homeassistant';
          el.service = (element.service && element.service.service) || '';
          el.serviceData = (element.service && element.service.data) || {};
          el.innerText = element.text;
        }
        el.classList.add('element');
        if (element.style) {
          Object.keys(element.style).forEach((prop) => {
            el.style.setProperty(prop, element.style[prop]);
          });
        }
        root.appendChild(el);
      });
    }
  }

  _hassChanged(hass) {
    this._requiresStateObj.forEach((element) => {
      const { el, entityId } = element;
      const stateObj = hass.states[entityId];
      el.stateObj = stateObj;
      el.title = this._computeTooltip(stateObj);
    });

    this._requiresTextState.forEach((element) => {
      const { el, entityId } = element;
      const stateObj = hass.states[entityId];
      el.innerText = computeStateDisplay(this.localize, stateObj);
      el.title = this._computeTooltip(stateObj);
    });
  }

  _computeTooltip(stateObj) {
    return `${computeStateName(stateObj)}: ${computeStateDisplay(this.localize, stateObj)}`;
  }

  _handleClick(entityId, toggle) {
    if (toggle) {
      const turnOn = !STATES_ON.includes(this.hass.states[entityId].state);
      const stateDomain = computeDomain(entityId);
      const serviceDomain = stateDomain === 'lock' || stateDomain === 'cover' ?
        stateDomain : 'homeassistant';

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
      this.hass.callService(serviceDomain, service, { entity_id: entityId });
    } else {
      this.fire('hass-more-info', { entityId });
    }
  }
}

customElements.define('hui-picture-elements-card', HuiPictureElementsCard);
