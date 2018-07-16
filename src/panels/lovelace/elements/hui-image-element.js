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
        title$="[[computeTooltip(_config)]]"
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
    if (this._config.tap_action !== 'none') {
      this.addEventListener('click', () => this.handleClick(this.hass, this._config));
      this.classList.add('clickable');
    }
  }

  setConfig(config) {
    if (!config) {
      throw Error('Error in element configuration');
    }

    this._config = config;
  }
}
customElements.define('hui-image-element', HuiImageElement);
