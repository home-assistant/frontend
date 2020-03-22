import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import CoverEntity from "../util/cover-model";

class HaCoverControls extends PolymerElement {
  static get template() {
    return html`
      <style>
        .state {
          white-space: nowrap;
        }
        [invisible] {
          visibility: hidden !important;
        }
      </style>

      <div class="state">
        <paper-icon-button
          aria-label="Open cover"
          icon="[[computeOpenIcon(stateObj)]]"
          on-click="onOpenTap"
          invisible$="[[!entityObj.supportsOpen]]"
          disabled="[[computeOpenDisabled(stateObj, entityObj)]]"
        ></paper-icon-button>
        <paper-icon-button
          aria-label="Stop the cover from moving"
          icon="hass:stop"
          on-click="onStopTap"
          invisible$="[[!entityObj.supportsStop]]"
        ></paper-icon-button>
        <paper-icon-button
          aria-label="Close cover"
          icon="[[computeCloseIcon(stateObj)]]"
          on-click="onCloseTap"
          invisible$="[[!entityObj.supportsClose]]"
          disabled="[[computeClosedDisabled(stateObj, entityObj)]]"
        ></paper-icon-button>
      </div>
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

  computeOpenIcon(stateObj) {
    console.log(stateObj);
    if (!stateObj.attributes.device_class) {
      return "hass:arrow-up";
    }

    switch (stateObj.attributes.device_class) {
      case "awning":
      case "curtain":
      case "gate":
        return "hass:arrow-expand-horizontal";
      default:
        return "hass:arrow-up";
    }
  }

  computeCloseIcon(stateObj) {
    console.log(stateObj);
    if (!stateObj.attributes.device_class) {
      return "hass:arrow-down";
    }

    switch (stateObj.attributes.device_class) {
      case "awning":
      case "curtain":
      case "gate":
        return "hass:arrow-collapse-horizontal";
      default:
        return "hass:arrow-down";
    }
  }

  computeOpenDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return (entityObj.isFullyOpen || entityObj.isOpening) && !assumedState;
  }

  computeClosedDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return (entityObj.isFullyClosed || entityObj.isClosing) && !assumedState;
  }

  onOpenTap(ev) {
    ev.stopPropagation();
    this.entityObj.openCover();
  }

  onCloseTap(ev) {
    ev.stopPropagation();
    this.entityObj.closeCover();
  }

  onStopTap(ev) {
    ev.stopPropagation();
    this.entityObj.stopCover();
  }
}

customElements.define("ha-cover-controls", HaCoverControls);
