import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import CoverEntity from "../util/cover-model";

class HaCoverTiltControls extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        :host {
          white-space: nowrap;
        }
        [invisible] {
          visibility: hidden !important;
        }
      </style>
      <paper-icon-button
        aria-label="Open cover tilt"
        icon="hass:arrow-top-right"
        on-click="onOpenTiltTap"
        title="Open tilt"
        invisible$="[[!entityObj.supportsOpenTilt]]"
        disabled="[[computeOpenDisabled(stateObj, entityObj)]]"
      ></paper-icon-button>
      <paper-icon-button
        aria-label="Stop cover from moving"
        icon="hass:stop"
        on-click="onStopTiltTap"
        invisible$="[[!entityObj.supportsStopTilt]]"
        title="Stop tilt"
      ></paper-icon-button>
      <paper-icon-button
        aria-label="Close cover tilt"
        icon="hass:arrow-bottom-left"
        on-click="onCloseTiltTap"
        title="Close tilt"
        invisible$="[[!entityObj.supportsCloseTilt]]"
        disabled="[[computeClosedDisabled(stateObj, entityObj)]]"
      ></paper-icon-button>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      stateObj: {
        type: Object,
      },
      entityObj: {
        type: Object,
        computed: "computeEntityObj(hass, stateObj)",
      },
    };
  }

  computeEntityObj(hass, stateObj) {
    return new CoverEntity(hass, stateObj);
  }

  computeOpenDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return entityObj.isFullyOpenTilt && !assumedState;
  }

  computeClosedDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return entityObj.isFullyClosedTilt && !assumedState;
  }

  onOpenTiltTap(ev) {
    ev.stopPropagation();
    this.entityObj.openCoverTilt();
  }

  onCloseTiltTap(ev) {
    ev.stopPropagation();
    this.entityObj.closeCoverTilt();
  }

  onStopTiltTap(ev) {
    ev.stopPropagation();
    this.entityObj.stopCoverTilt();
  }
}

customElements.define("ha-cover-tilt-controls", HaCoverTiltControls);
