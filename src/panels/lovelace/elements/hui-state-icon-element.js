import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/entity/state-badge.js';

import ElementClickMixin from '../mixins/element-click-mixin.js';

/*
 * @appliesMixin ElementClickMixin
 */
class HuiStateIconElement extends ElementClickMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host(.clickable) {
          cursor: pointer; 
        } 
      </style>
      <state-badge 
        state-obj="[[_stateObj]]"
        title$="[[computeTooltip(_config)]]"
      ></state-badge> 
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      _config: Object,
      _stateObj: Object
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', () => this.handleClick(this.hass, this._config));
    this.classList.add('clickable');
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw Error('Error in element configuration');
    }

    this._config = config;
  }

  _hassChanged(hass) {
    this._stateObj = hass.states[this._config.entity];
  }
}
customElements.define('hui-state-icon-element', HuiStateIconElement);
