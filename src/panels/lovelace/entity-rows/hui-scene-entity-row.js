import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-button/paper-button";

import "../components/hui-generic-entity-row";

import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class HuiSceneEntityRow extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
      >
        ${this.sceneControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin-right: -.57em;
        }
      </style>
    `;
  }

  static get sceneControlTemplate() {
    return html`
      <paper-button on-click="_callService">
        [[localize('ui.card.scene.activate')]]
      </paper-button>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
    };
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Entity not configured.");
    }
    this._config = config;
  }

  _callService(ev) {
    ev.stopPropagation();
    this.hass.callService("scene", "turn_on", {
      entity_id: this._config.entity,
    });
  }
}
customElements.define("hui-scene-entity-row", HuiSceneEntityRow);
