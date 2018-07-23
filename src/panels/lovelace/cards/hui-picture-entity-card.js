import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-card.js';
import '../components/hui-image.js';

import computeDomain from '../../../common/entity/compute_domain.js';
import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name.js';
import toggleEntity from '../common/entity/toggle-entity.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

const UNAVAILABLE = 'Unavailable';

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HuiPictureEntityCard extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        ha-card {
          min-height: 75px;
          overflow: hidden;
          position: relative;
        }
        ha-card.canInteract {
          cursor: pointer;
        }
        .info {
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
        [hidden] {
          display: none;
        }
      </style>

      <ha-card id='card' on-click="_cardClicked">
        <hui-image
          hass="[[hass]]"
          image="[[_config.image]]"
          state-image="[[_config.state_image]]"
          camera-image="[[_getCameraImage(_config)]]"
          entity="[[_config.entity]]"
        ></hui-image>
        <div class="info" hidden$='[[_computeHideInfo(_config)]]'>
          <div id="name"></div>
          <div id="state"></div>
        </div>
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

  getCardSize() {
    return 3;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Error in card configuration.');
    }

    this._entityDomain = computeDomain(config.entity);
    if (this._entityDomain !== 'camera' &&
        (!config.image && !config.state_image && !config.camera_image)) {
      throw new Error('No image source configured.');
    }

    this._config = config;
  }

  _hassChanged(hass) {
    const config = this._config;
    const entityId = config.entity;
    const stateObj = hass.states[entityId];

    // Nothing changed
    if ((!stateObj && this._oldState === UNAVAILABLE) ||
        (stateObj && stateObj.state === this._oldState)) {
      return;
    }

    let name;
    let state;
    let stateLabel;
    let canInteract = true;

    if (stateObj) {
      name = config.name || computeStateName(stateObj);
      state = stateObj.state;
      stateLabel = this._computeStateLabel(stateObj);
    } else {
      name = config.name || entityId;
      state = UNAVAILABLE;
      stateLabel = UNAVAILABLE;
      canInteract = false;
    }

    this.$.name.innerText = name;
    this.$.state.innerText = stateLabel;
    this._oldState = state;
    this.$.card.classList.toggle('canInteract', canInteract);
  }

  _computeStateLabel(stateObj) {
    switch (this._entityDomain) {
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

  _computeHideInfo(config) {
    // By default we will show it, so === undefined should be true.
    return config.show_info === false;
  }

  _cardClicked() {
    const config = this._config;
    const entityId = config.entity;

    if (!(entityId in this.hass.states)) return;

    if (config.tap_action === 'toggle') {
      toggleEntity(this.hass, entityId);
    } else {
      this.fire('hass-more-info', { entityId });
    }
  }

  _getCameraImage(config) {
    return this._entityDomain === 'camera' ? config.entity : config.camera_image;
  }
}

customElements.define('hui-picture-entity-card', HuiPictureEntityCard);
