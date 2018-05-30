import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-info.js';
import '../components/ha-cover-controls.js';
import '../components/ha-cover-tilt-controls.js';
import CoverEntity from '../util/cover-model.js';

class StateCardCover extends PolymerElement {
  static get template() {
    return html`
    <style is="custom-style" include="iron-flex iron-flex-alignment"></style>
    <style>
      :host {
        line-height: 1.5;
      }
    </style>

    <div class="horizontal justified layout">
      ${this.stateInfoTemplate}
      <div class="horizontal layout">
        ${this.haCoverControlsTemplate}
        ${this.haCoverTiltControlsTemplate}
      </div>
    </div>
`;
  }

  static get stateInfoTemplate() {
    return html`
    <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
`;
  }

  static get haCoverControlsTemplate() {
    return html`
    <ha-cover-controls hidden\$="[[entityObj.isTiltOnly]]" hass="[[hass]]" state-obj="[[stateObj]]"></ha-cover-controls>
`;
  }

  static get haCoverTiltControlsTemplate() {
    return html`
    <ha-cover-tilt-controls hidden\$="[[!entityObj.isTiltOnly]]" hass="[[hass]]" state-obj="[[stateObj]]"></ha-cover-tilt-controls>
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
      entityObj: {
        type: Object,
        computed: 'computeEntityObj(hass, stateObj)',
      },
    };
  }

  computeEntityObj(hass, stateObj) {
    var entity = new CoverEntity(hass, stateObj);
    return entity;
  }
}
customElements.define('state-card-cover', StateCardCover);
