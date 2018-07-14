import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-icon.js';

import ElementClickMixin from '../mixins/element-click-mixin.js';

/*
 * @appliesMixin ElementClickMixin
 */
class HuiServiceIconElement extends ElementClickMixin(PolymerElement) {
  static get template() {
    return html`
      <ha-icon 
        icon="[[_config.icon]]"
        title="[[_config.title]]"
      ></ha-icon> 
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object
    };
  }

  constructor() {
    super();
    this._clickListener = this.handleClick.bind(this);
  }

  ready() {
    super.ready();
    this.classList.add('clickable');
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._clickListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._clickListener);
  }

  setConfig(config) {
    if (!config || !config.icon || !config.service) {
      throw Error('Error in element configuration');
    }

    this._config = Object.assign({}, config);
    this._config.tap_action = 'call-service';
  }
}
customElements.define('hui-service-icon-element', HuiServiceIconElement);
