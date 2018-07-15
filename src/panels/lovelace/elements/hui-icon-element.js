import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-icon.js';

import ElementClickMixin from '../mixins/element-click-mixin.js';

/*
 * @appliesMixin ElementClickMixin
 */
class HuiIconElement extends ElementClickMixin(PolymerElement) {
  static get template() {
    return html`
      <ha-icon 
        icon="[[_config.icon]]"
        title$="[[_computeTooltip(_config)]]"
      ></ha-icon> 
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
    this.classList.add('clickable');
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', () => this.handleClick(this.hass, this._config));
  }

  setConfig(config) {
    if (!config || !config.icon) {
      throw Error('Error in element configuration');
    }

    this._config = config;
  }

  _computeTooltip(config) {
    if (config.title) return config.title;

    let tooltip;
    switch (config.tap_action) {
      case 'navigate':
        tooltip = `Navigate to ${config.navigation_path}`;
        break;
      case 'toggle':
        tooltip = `Toggle ${config.entity}`;
        break;
      case 'call-service':
        tooltip = `Call service ${config.service}`;
        break;
      default:
        tooltip = 'Show more-info';
    }

    return tooltip;
  }
}
customElements.define('hui-icon-element', HuiIconElement);
