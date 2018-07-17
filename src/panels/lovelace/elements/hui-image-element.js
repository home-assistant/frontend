import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-image.js';

import ElementClickMixin from '../mixins/element-click-mixin.js';

/*
 * @appliesMixin ElementClickMixin
 */
class HuiImageElement extends ElementClickMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host(.clickable) {
          cursor: pointer; 
        } 
        hui-image {
          overflow-y: hidden;
        } 
      </style>
      <hui-image
        hass="[[hass]]"
        entity="[[_config.entity]]"
        image="[[_config.image]]"
        state-image="[[_config.state_image]]"
        camera-image="[[_config.camera_image]]"
        filter="[[_config.filter]]"
        state-filter="[[_config.state_filter]]"
        title$="[[computeTooltip(hass, _config)]]"
      ></hui-image>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', () => this.handleClick(this.hass, this._config));
  }

  setConfig(config) {
    if (!config) {
      throw Error('Error in element configuration');
    }

    this.classList.toggle('clickable', config.tap_action !== 'none');
    this._config = config;
  }
}
customElements.define('hui-image-element', HuiImageElement);
