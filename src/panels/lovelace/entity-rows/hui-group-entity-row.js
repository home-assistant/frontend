import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import { DOMAINS_TOGGLE } from "../../../common/const";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HuiGroupEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        ${this.groupControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get groupControlTemplate() {
    return html`
      <template is="dom-if" if="[[_canToggle]]">
        <ha-entity-toggle
          hass="[[hass]]"
          state-obj="[[_stateObj]]"
        ></ha-entity-toggle>
      </template>
      <template is="dom-if" if="[[!_canToggle]]">
        <div>
          [[_computeState(_stateObj)]]
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
      },
      _canToggle: {
        type: Boolean,
        computed: "_computeCanToggle(_stateObj.attributes.entity_id)",
      },
    };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Entity not configured.");
    }
    this._config = config;
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  _computeCanToggle(entityIds) {
    return entityIds.some((entityId) =>
      DOMAINS_TOGGLE.has(entityId.split(".", 1)[0])
    );
  }

  _computeState(stateObj) {
    return computeStateDisplay(this.localize, stateObj);
  }
}
customElements.define("hui-group-entity-row", HuiGroupEntityRow);
