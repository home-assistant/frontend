import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hui-generic-entity-row.js';
import '../../../components/entity/ha-entity-toggle.js';

class HuiToggleEntityRow extends PolymerElement {
  static get template() {
    return html`
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        <ha-entity-toggle hass="[[hass]]" state-obj="[[_computeStateObj(hass.states, _config.entity)]]"></ha-entity-toggle>
      </hui-generic-entity-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object
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
}
customElements.define('hui-toggle-entity-row', HuiToggleEntityRow);
