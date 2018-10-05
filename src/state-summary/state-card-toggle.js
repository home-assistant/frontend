import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/ha-entity-toggle.js';
import '../components/entity/state-info.js';

class StateCardToggle extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
    ${this.stateInfoTemplate}
    <ha-entity-toggle state-obj="[[stateObj]]" hass="[[hass]]"></ha-entity-toggle>
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
      }
    };
  }
}
customElements.define('state-card-toggle', StateCardToggle);
