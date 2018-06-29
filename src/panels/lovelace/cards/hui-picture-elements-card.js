import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';
import '../../../components/entity/state-badge.js';
import '../../../components/ha-card.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import toggleEntity from '../common/entity/toggle-entity.js';

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

    <ha-card header="[[_config.title]]">
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
      _config: Object,
    };
  }

  constructor() {
    super();
    this._requiresStateObj = [];
    this._requiresTextState = [];
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  getCardSize() {
    return 4;
  }

  setConfig(config) {
    if (!config || !config.image || !Array.isArray(config.elements)) {
      throw new Error('Invalid card configuration');
    }

    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;
    const root = this.$.root;
    this._requiresStateObj = [];
    this._requiresTextState = [];

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const img = document.createElement('img');
    img.src = config.image;
    root.appendChild(img);

    config.elements.forEach((element) => {
      let el;
      if (element.type === 'state-badge') {
        const entityId = element.entity;
        el = document.createElement('state-badge');
        el.addEventListener('click', () => this._handleClick(entityId, element.tap_action === 'toggle'));
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
        el.innerText = element.title;
      }
      el.classList.add('element');
      if (element.style) {
        Object.keys(element.style).forEach((prop) => {
          el.style.setProperty(prop, element.style[prop]);
        });
      }
      root.appendChild(el);
    });

    if (this.hass) {
      this._hassChanged(this.hass);
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
      toggleEntity(this.hass, entityId);
    } else {
      this.fire('hass-more-info', { entityId });
    }
  }
}

customElements.define('hui-picture-elements-card', HuiPictureElementsCard);
