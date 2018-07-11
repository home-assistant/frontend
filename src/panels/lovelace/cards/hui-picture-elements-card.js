import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/buttons/ha-call-service-button.js';
import '../../../components/entity/ha-state-label-badge.js';
import '../../../components/entity/state-badge.js';
import '../../../components/ha-icon.js';
import '../../../components/ha-card.js';
import '../components/hui-image.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import computeDomain from '../../../common/entity/compute_domain';
import toggleEntity from '../common/entity/toggle-entity.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';
import NavigateMixin from '../../../mixins/navigate-mixin.js';

const VALID_TYPES = new Set([
  'image',
  'navigation',
  'service-button',
  'state-badge',
  'state-icon',
  'state-label',
]);

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HuiPictureElementsCard extends NavigateMixin(EventsMixin(LocalizeMixin(PolymerElement))) {
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
        position: absolute;
        transform: translate(-50%, -50%);
      }
      .state-label {
        padding: 8px;
        white-space: nowrap;
      }
      .clickable {
        cursor: pointer;
      }
      ha-call-service-button {
        color: var(--primary-color);
        white-space: nowrap;
      }
      hui-image {
        overflow-y: hidden;
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
      _config: Object
    };
  }

  constructor() {
    super();
    this._stateBadges = [];
    this._stateIcons = [];
    this._stateLabels = [];
    this._images = [];
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
    const invalidTypes = config.elements.map(el => el.type).filter(el => !VALID_TYPES.has(el));
    if (invalidTypes.length) {
      throw new Error(`Incorrect element types: ${invalidTypes.join(', ')}`);
    }

    this._config = config;
    if (this.$) this._buildConfig();
  }

  _buildConfig() {
    const config = this._config;
    const root = this.$.root;

    this._stateBadges = [];
    this._stateIcons = [];
    this._stateLabels = [];

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    const img = document.createElement('img');
    img.src = config.image;
    root.appendChild(img);

    config.elements.forEach((element) => {
      const entityId = element.entity;
      let el;
      switch (element.type) {
        case 'service-button':
          el = document.createElement('ha-call-service-button');
          [el.domain, el.service] = element.service.split('.', 2);
          el.serviceData = element.service_data || {};
          el.innerText = element.title;
          el.hass = this.hass;
          break;
        case 'state-badge':
          el = document.createElement('ha-state-label-badge');
          el.state = this.hass.states[entityId];
          this._stateBadges.push({ el, entityId });
          break;
        case 'state-icon':
          el = document.createElement('state-badge');
          el.addEventListener('click', () => this._handleClick(entityId, element.tap_action === 'toggle'));
          el.classList.add('clickable');
          this._stateIcons.push({ el, entityId });
          break;
        case 'state-label':
          el = document.createElement('div');
          el.addEventListener('click', () => this._handleClick(entityId, false));
          el.classList.add('clickable', 'state-label');
          this._stateLabels.push({ el, entityId });
          break;
        case 'navigation':
          el = document.createElement('ha-icon');
          el.icon = element.icon || 'hass:image-filter-center-focus';
          el.addEventListener('click', () => this.navigate(element.navigation_path));
          el.title = element.navigation_path;
          el.classList.add('clickable');
          break;
        case 'image':
          el = document.createElement('hui-image');
          el.hass = this.hass;
          el.entity = element.entity;
          el.image = element.image;
          el.stateImage = element.state_image;
          el.filter = element.filter;
          el.stateFilter = element.state_filter;
          if (!element.camera_image && computeDomain(element.entity) === 'camera') {
            el.cameraImage = element.entity;
          } else {
            el.cameraImage = element.camera_image;
          }
          el.addEventListener('click', () => this._handleImageClick(element));
          el.classList.add('clickable');
          this._images.push(el);
      }

      el.classList.add('element');
      Object.keys(element.style).forEach((prop) => {
        el.style.setProperty(prop, element.style[prop]);
      });
      root.appendChild(el);
    });

    if (this.hass) {
      this._hassChanged(this.hass);
    }
  }

  _hassChanged(hass) {
    this._stateBadges.forEach((element) => {
      const { el, entityId } = element;
      el.state = hass.states[entityId];
      el.hass = hass;
    });

    this._stateIcons.forEach((element) => {
      const { el, entityId } = element;
      const stateObj = hass.states[entityId];
      if (stateObj) {
        el.stateObj = stateObj;
        el.title = this._computeTooltip(stateObj);
      }
    });

    this._stateLabels.forEach((element) => {
      const { el, entityId } = element;
      const stateObj = hass.states[entityId];
      if (stateObj) {
        el.innerText = computeStateDisplay(this.localize, stateObj);
        el.title = this._computeTooltip(stateObj);
      } else {
        el.innerText = 'N/A';
        el.title = '';
      }
    });

    this._images.forEach((el) => {
      el.hass = hass;
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

  _handleImageClick(element) {
    if (element.tap_action !== 'call_service') {
      this._handleClick(element.entity, element.tap_action === 'toggle');
      return;
    }

    if (!element.service) return;

    const [domain, service] = element.service.split('.', 2);
    const serviceData = Object.assign({}, { entity_id: element.entity }, element.service_data);
    this.hass.callService(domain, service, serviceData);
  }
}

customElements.define('hui-picture-elements-card', HuiPictureElementsCard);
