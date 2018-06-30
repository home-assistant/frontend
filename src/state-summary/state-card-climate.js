import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import '../components/ha-climate-state.js';

class StateCardClimate extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
    <style>
      :host {
        @apply --paper-font-body1;
        line-height: 1.5;
      }

      ha-climate-state {
        margin-left: 16px;
        text-align: right;
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <ha-climate-state hass="[[hass]]" state-obj="[[stateObj]]"></ha-climate-state>
    </div>
`;
  }

  static get stateInfoTemplate() {
    return html`
    <state-info hass="[[hass]]" state-obj="[[stateObj]]" in-dialog="[[inDialog]]" entity-config="[[entityConfig]]"></state-info>
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
      entityConfig: Object,
    };
  }
}
customElements.define('state-card-climate', StateCardClimate);
