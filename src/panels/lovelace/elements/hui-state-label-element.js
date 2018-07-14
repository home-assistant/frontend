import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';
import computeStateName from '../../../common/entity/compute_state_name';

import '../../../components/entity/ha-state-label-badge.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';
import ElementClickMixin from '../mixins/element-click-mixin.js';

/*
 * @appliesMixin ElementClickMixin
 * @appliesMixin LocalizeMixin
 */
class HuiStateLabelElement extends LocalizeMixin(ElementClickMixin(PolymerElement)) {
  static get template() {
    return html`
      <div title$="[[_computeTooltip(_stateObj)]]">[[_computeStateDisplay(_stateObj)]]</div>
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
    if (!config || !config.entity) {
      throw Error('Error in element configuration');
    }

    this._config = config;
  }

  _hassChanged(hass) {
    this._stateObj = hass.states[this._config.entity];
  }

  _computeStateDisplay(stateObj) {
    return stateObj && computeStateDisplay(this.localize, stateObj);
  }

  _computeTooltip(stateObj) {
    return !stateObj ? '' :
      `${computeStateName(stateObj)}: ${computeStateDisplay(this.localize, stateObj)}`;
  }
}
customElements.define('hui-state-label-element', HuiStateLabelElement);
