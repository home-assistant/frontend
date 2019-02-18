import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@material/mwc-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";

import LocalizeMixin from "../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 */
class StateCardScript extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        mwc-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
        }

        ha-entity-toggle {
          margin-left: 16px;
        }
      </style>

      <div class="horizontal justified layout">
        ${this.stateInfoTemplate}
        <template is="dom-if" if="[[stateObj.attributes.can_cancel]]">
          <ha-entity-toggle
            state-obj="[[stateObj]]"
            hass="[[hass]]"
          ></ha-entity-toggle>
        </template>
        <template is="dom-if" if="[[!stateObj.attributes.can_cancel]]">
          <mwc-button on-click="fireScript"
            >[[localize('ui.card.script.execute')]]</mwc-button
          >
        </template>
      </div>
    `;
  }

  static get stateInfoTemplate() {
    return html`
      <state-info
        hass="[[hass]]"
        state-obj="[[stateObj]]"
        in-dialog="[[inDialog]]"
      ></state-info>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
    };
  }

  fireScript(ev) {
    ev.stopPropagation();
    this.hass.callService("script", "turn_on", {
      entity_id: this.stateObj.entity_id,
    });
  }
}
customElements.define("state-card-script", StateCardScript);
