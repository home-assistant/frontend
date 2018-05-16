import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/ha-entity-toggle.js';
import '../components/entity/state-info.js';
import '../util/hass-mixins.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class StateCardScript extends window.hassMixins.LocalizeMixin(PolymerElement) {
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

      ha-entity-toggle {
        margin-left: 16px;
      }
    </style>

    <div class="horizontal justified layout">
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <template is="dom-if" if="[[stateObj.attributes.can_cancel]]">
        <ha-entity-toggle state-obj="[[stateObj]]" hass="[[hass]]"></ha-entity-toggle>
      </template>
      <template is="dom-if" if="[[!stateObj.attributes.can_cancel]]">
        <paper-button on-click="fireScript">[[localize('ui.card.script.execute')]]</paper-button>
      </template>
    </div>
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
    this.hass.callService(
      'script', 'turn_on',
      { entity_id: this.stateObj.entity_id }
    );
  }
}
customElements.define('state-card-script', StateCardScript);
