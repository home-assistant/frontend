import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/ha-entity-toggle.js';
import '../components/entity/state-info.js';

class StateCardToggle extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
    <style>
      ha-entity-toggle {
        margin: -4px -16px -4px 0;
        padding: 4px 16px;
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <ha-entity-toggle state-obj="[[stateObj]]" hass="[[hass]]"></ha-entity-toggle>
    </div>
`;
  }

  static get stateInfoTemplate() {
    return html`
    <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
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
}
customElements.define('state-card-toggle', StateCardToggle);
