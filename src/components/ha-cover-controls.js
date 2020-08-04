import "./ha-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { UNAVAILABLE } from "../data/entity";
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
        <ha-icon-button
          aria-label="Open cover"
          icon="[[computeOpenIcon(stateObj)]]"
          on-click="onOpenTap"
          invisible$="[[!entityObj.supportsOpen]]"
          disabled="[[computeOpenDisabled(stateObj, entityObj)]]"
        ></ha-icon-button>
        <ha-icon-button
          aria-label="Stop the cover from moving"
          icon="hass:stop"
          on-click="onStopTap"
          invisible$="[[!entityObj.supportsStop]]"
          disabled="[[computeStopDisabled(stateObj)]]"
        ></ha-icon-button>
        <ha-icon-button
          aria-label="Close cover"
          icon="[[computeCloseIcon(stateObj)]]"
          on-click="onCloseTap"
          invisible$="[[!entityObj.supportsClose]]"
          disabled="[[computeClosedDisabled(stateObj, entityObj)]]"
        ></ha-icon-button>
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
    switch (stateObj.attributes.device_class) {
      case "awning":
      case "door":
      case "gate":
        return "hass:arrow-expand-horizontal";
      default:
        return "hass:arrow-up";
    }
  }

  computeCloseIcon(stateObj) {
    switch (stateObj.attributes.device_class) {
      case "awning":
      case "door":
      case "gate":
        return "hass:arrow-collapse-horizontal";
      default:
        return "hass:arrow-down";
    }
  }

  computeStopDisabled(stateObj) {
    if (stateObj.state === UNAVAILABLE) {
      return true;
    }
    return false;
  }

  computeOpenDisabled(stateObj, entityObj) {
    if (stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = stateObj.attributes.assumed_state === true;
    return (entityObj.isFullyOpen || entityObj.isOpening) && !assumedState;
  }

  computeClosedDisabled(stateObj, entityObj) {
    if (stateObj.state === UNAVAILABLE) {
      return true;
    }
    const assumedState = stateObj.attributes.assumed_state === true;
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
