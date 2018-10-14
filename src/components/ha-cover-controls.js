import "@polymer/paper-icon-button/paper-icon-button.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import CoverEntity from "../util/cover-model.js";

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
      <paper-icon-button icon="[[computeIcon('left')]]" on-click="onOpenTap" invisible$="[[!entityObj.supportsOpen]]" disabled="[[computeOpenDisabled(stateObj, entityObj)]]"></paper-icon-button>
      <paper-icon-button icon="hass:stop" on-click="onStopTap" invisible$="[[!entityObj.supportsStop]]"></paper-icon-button>
      <paper-icon-button icon="[[computeIcon('right')]]" on-click="onCloseTap" invisible$="[[!entityObj.supportsClose]]" disabled="[[computeClosedDisabled(stateObj, entityObj)]]"></paper-icon-button>
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

  computeOpenDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return (entityObj.isFullyOpen || entityObj.isOpening) && !assumedState;
  }

  computeClosedDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return (entityObj.isFullyClosed || entityObj.isClosing) && !assumedState;
  }

  computeIcon(position) {
    switch (this.entityObj.deviceClass) {
      case "curtain":
        if (position === "left") {
          return "hass:arrow-left";
        }
        return "hass:arrow-right";
      default:
        if (position === "left") {
          return "hass:arrow-up";
        }
        return "hass:arrow-down";
    }
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
