import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { DOMAINS_TOGGLE } from "../../../common/const";
import turnOnOffEntities from "../common/entity/turn-on-off-entities";

class HuiEntitiesToggle extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          width: 38px;
          display: block;
        }
        paper-toggle-button {
          cursor: pointer;
          --paper-toggle-button-label-spacing: 0;
          padding: 13px 5px;
          margin: -4px -5px;
        }
      </style>
      <template is="dom-if" if="[[_toggleEntities.length]]">
        <paper-toggle-button
          checked="[[_computeIsChecked(hass, _toggleEntities)]]"
          on-change="_callService"
        ></paper-toggle-button>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      entities: Array,
      _toggleEntities: {
        type: Array,
        computed: "_computeToggleEntities(hass, entities)",
      },
    };
  }

  _computeToggleEntities(hass, entityIds) {
    return entityIds.filter(
      (entityId) =>
        entityId in hass.states && DOMAINS_TOGGLE.has(entityId.split(".", 1)[0])
    );
  }

  _computeIsChecked(hass, entityIds) {
    return entityIds.some((entityId) => hass.states[entityId].state === "on");
  }

  _callService(ev) {
    const turnOn = ev.target.checked;
    turnOnOffEntities(this.hass, this._toggleEntities, turnOn);
  }
}

customElements.define("hui-entities-toggle", HuiEntitiesToggle);
