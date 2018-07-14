import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-icon.js';

import NavigateMixin from '../../../mixins/navigate-mixin';

/*
 * @appliesMixin NavigateMixin
 */
class HuiNavigationElement extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
      <ha-icon 
        icon="[[_icon]]"
        title="[[_config.navigation_path]]"
      ></ha-icon> 
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _icon: String
    };
  }

  constructor() {
    super();
    this._clickListener = this.navigate.bind(this);
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
    if (!config || !config.navigation_path) {
      throw Error('Error in element configuration');
    }

    this._icon = config.icon || 'hass:image-filter-center-focus';
    this._config = config;
  }
}
customElements.define('hui-navigation-element', HuiNavigationElement);
