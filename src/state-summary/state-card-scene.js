import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import LocalizeMixin from '../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class StateCardScene extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment"></style>
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
      ${this.stateInfoTemplate}
      <paper-button on-click="activateScene">[[localize('ui.card.scene.activate')]]</paper-button>
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

  activateScene(ev) {
    ev.stopPropagation();
    this.hass.callService(
      'scene', 'turn_on',
      { entity_id: this.stateObj.entity_id }
    );
  }
}
customElements.define('state-card-scene', StateCardScene);
