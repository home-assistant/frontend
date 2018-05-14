import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';

class StateCardConfigurator extends PolymerElement {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
    <style>
      paper-button {
        color: var(--primary-color);
        font-weight: 500;
        top: 3px;
        height: 37px;
        margin-right: -.57em;
      }
    </style>

    <div class="horizontal justified layout">
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <paper-button hidden\$="[[inDialog]]">[[stateObj.state]]</paper-button>
    </div>

    <!-- pre load the image so the dialog is rendered the proper size -->
    <template is="dom-if" if="[[stateObj.attributes.description_image]]">
      <img hidden="" src="[[stateObj.attributes.description_image]]">
    </template>
`;
  }

  static get is() { return 'state-card-configurator'; }

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
customElements.define(StateCardConfigurator.is, StateCardConfigurator);
