import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/ha-entity-toggle.js';
import '../components/entity/state-info.js';
import '../components/ha-climate-state.js';

class StateCardSousVide extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
    <style>
      :host {
        @apply --paper-font-body1;
        line-height: 1.5;
      }

      ha-entity-toggle {
        margin: -4px -16px -4px 0;
        padding: 4px 16px;
      }

      .ha-show-state {
        width: 300px;
        height: 500px;
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <ha-climate-state state-obj="[[stateObj]]" hass="[[hass]]"></ha-climate-state>
      <ha-entity-toggle state-obj="[[stateObj]]" hass="[[hass]]"></ha-entity-toggle>
    </div>
`;
  }

  static get stateInfoTemplate() {
    return html`
    <state-info 
      hass="[[hass]]" 
      state-obj="[[stateObj]]" 
      in-dialog="[[inDialog]]" 
      override-name="[[overrideName]]">
    </state-info>
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
      overrideName: String
    };
  }

  _toStr(obj) {
    return JSON.stringify(obj, null, 2);
  }
}
customElements.define('state-card-sous_vide', StateCardSousVide);
