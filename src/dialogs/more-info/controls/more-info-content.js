import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "./more-info-alarm_control_panel.js";
import "./more-info-automation.js";
import "./more-info-camera.js";
import "./more-info-climate.js";
import "./more-info-configurator.js";
import "./more-info-cover.js";
import "./more-info-default.js";
import "./more-info-fan.js";
import "./more-info-group.js";
import "./more-info-history_graph.js";
import "./more-info-input_datetime.js";
import "./more-info-light.js";
import "./more-info-lock.js";
import "./more-info-media_player.js";
import "./more-info-script.js";
import "./more-info-sun.js";
import "./more-info-updater.js";
import "./more-info-vacuum.js";
import "./more-info-water_heater.js";
import "./more-info-weather.js";

import stateMoreInfoType from "../../../common/entity/state_more_info_type.js";
import dynamicContentUpdater from "../../../common/dom/dynamic_content_updater.js";

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
