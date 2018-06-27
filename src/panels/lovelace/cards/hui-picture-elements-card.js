import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

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
        line-height: 0;
      }
      #root {
        position: relative;
      }
      #root img {
        width: 100%;
      }
      #root .entity {
        white-space: nowrap;
        position: absolute;
        transform: translate(-50%, -50%);
      }
      #root .clickable {
        cursor: pointer;
        padding: 4px;
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
          const stateObj = this.hass.states[entityId];
          el = document.createElement('state-badge');
          el.stateObj = stateObj;
          el.addEventListener('click', () => this._handleClick(entityId, element.action === 'toggle'));
          el.classList.add('clickable');
          el.title = this._computeTooltip(stateObj);
          if (element.style) {
            Object.keys(element.style).forEach((prop) => {
              el.style.setProperty(prop, element.style[prop]);
            });
          }
          this._requiresStateObj.push({ el, entityId });
        }
        el.classList.add('entity');
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
