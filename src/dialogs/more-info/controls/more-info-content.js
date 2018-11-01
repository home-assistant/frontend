import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./more-info-alarm_control_panel";
import "./more-info-automation";
import "./more-info-camera";
import "./more-info-climate";
import "./more-info-configurator";
import "./more-info-cover";
import "./more-info-default";
import "./more-info-fan";
import "./more-info-group";
import "./more-info-history_graph";
import "./more-info-input_datetime";
import "./more-info-light";
import "./more-info-lock";
import "./more-info-media_player";
import "./more-info-script";
import "./more-info-sun";
import "./more-info-updater";
import "./more-info-vacuum";
import "./more-info-water_heater";
import "./more-info-weather";

import stateMoreInfoType from "../../../common/entity/state_more_info_type";
import dynamicContentUpdater from "../../../common/dom/dynamic_content_updater";

class MoreInfoContent extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
    };
  }

  static get observers() {
    return ["stateObjChanged(stateObj, hass)"];
  }

  constructor() {
    super();
    this.style.display = "block";
  }

  stateObjChanged(stateObj, hass) {
    let moreInfoType;
    if (!stateObj || !hass) {
      if (this.lastChild) {
        this._detachedChild = this.lastChild;
        // Detach child to prevent it from doing work.
        this.removeChild(this.lastChild);
      }
      return;
    }
    if (this._detachedChild) {
      this.appendChild(this._detachedChild);
      this._detachedChild = null;
    }
    if (stateObj.attributes && "custom_ui_more_info" in stateObj.attributes) {
      moreInfoType = stateObj.attributes.custom_ui_more_info;
    } else {
      moreInfoType = "more-info-" + stateMoreInfoType(stateObj);
    }
    dynamicContentUpdater(this, moreInfoType.toUpperCase(), {
      hass: hass,
      stateObj: stateObj,
    });
  }
}

customElements.define("more-info-content", MoreInfoContent);
