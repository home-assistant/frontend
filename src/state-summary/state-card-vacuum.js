import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import '../components/ha-vacuum-state.js';
import '../components/entity/ha-entity-toggle.js';

class StateCardVacuum extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <template is="dom-if" if="[[stateObj.attributes.supported_features]]">
        <ha-vacuum-state hass="[[hass]]" state-obj="[[stateObj]]"></ha-vacuum-state>
      </template>
      <template is="dom-if" if="[[!stateObj.attributes.supported_features]]">
        <ha-entity-toggle hass="[[hass]]" state-obj="[[stateObj]]"></ha-entity-toggle>
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
      }
    };
  }

  _supportsState(supported_features) {
    return (supported_features & 4096) !== 0;
  }
}
customElements.define('state-card-vacuum', StateCardVacuum);
