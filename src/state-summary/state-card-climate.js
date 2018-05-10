import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../components/ha-climate-state.js';
import '../components/entity/state-info.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
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
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <ha-climate-state state-obj="[[stateObj]]"></ha-climate-state>
    </div>
`;
  }

  static get is() { return 'state-card-climate'; }

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
customElements.define(StateCardClimate.is, StateCardClimate);
