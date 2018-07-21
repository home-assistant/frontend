import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';

import computeStateDisplay from '../../../common/entity/compute_state_display.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HuiMediaPlayerEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        <div>
          [[_computeState(_stateObj)]]
        </div>
        
        <div slot="secondary">
          [[_computeMediaTitle(_stateObj)]] 
        </div>
      </hui-generic-entity-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)'
      }
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('Entity not configured.');
    }
    this._config = config;
  }

  _computeMediaTitle(stateObj) {
    if (!stateObj) return null;
    return stateObj.attributes.media_title || null;
  }

  _computeState(stateObj) {
    if (!stateObj) return this.localize('state.default.unavailable');
    return computeStateDisplay(this.localize, stateObj);
  }
}
customElements.define('hui-media-player-entity-row', HuiMediaPlayerEntityRow);
