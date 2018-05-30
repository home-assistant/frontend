import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import '../components/ha-climate-state.js';

class StateCardClimate extends PolymerElement {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
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
      ${this.haClimateStateTemplate}
    </div>
`;
  }

  static get stateInfoTemplate() {
    return html`
    <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
`;
  }

  static get haClimateStateTemplate() {
    return html`
    <ha-climate-state state-obj="[[stateObj]]"></ha-climate-state>
`;
  }

  static get properties() {
    return {
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
    };
  }
}
customElements.define('state-card-climate', StateCardClimate);
