import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../components/entity/state-info.js';
import '../components/ha-cover-controls.js';
import '../components/ha-cover-tilt-controls.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

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
      <state-info state-obj="[[stateObj]]" in-dialog="[[inDialog]]"></state-info>
      <div class="horizontal layout">
        <ha-cover-controls hidden\$="[[entityObj.isTiltOnly]]" hass="[[hass]]" state-obj="[[stateObj]]"></ha-cover-controls>
        <ha-cover-tilt-controls hidden\$="[[!entityObj.isTiltOnly]]" hass="[[hass]]" state-obj="[[stateObj]]"></ha-cover-tilt-controls>
      </div>
    </div>
`;
  }

  static get is() { return 'state-card-cover'; }

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
    var entity = new window.CoverEntity(hass, stateObj);
    return entity;
  }
}
customElements.define(StateCardCover.is, StateCardCover);
