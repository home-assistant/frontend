import { PropertyValues, UpdatingElement, property } from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";

import "./more-info-alarm_control_panel";
import "./more-info-automation";
import "./more-info-camera";
import "./more-info-climate";
import "./more-info-configurator";
import "./more-info-counter";
import "./more-info-cover";
import "./more-info-default";
import "./more-info-fan";
import "./more-info-group";
import "./more-info-history_graph";
import "./more-info-input_datetime";
import "./more-info-light";
import "./more-info-lock";
import "./more-info-media_player";
import "./more-info-person";
import "./more-info-script";
import "./more-info-sun";
import "./more-info-timer";
import "./more-info-vacuum";
import "./more-info-water_heater";
import "./more-info-weather";

import { stateMoreInfoType } from "../../../common/entity/state_more_info_type";
import dynamicContentUpdater from "../../../common/dom/dynamic_content_updater";
import { HomeAssistant } from "../../../types";

class MoreInfoContent extends UpdatingElement {
  @property() public hass?: HomeAssistant;
  @property() public stateObj?: HassEntity;
  private _detachedChild?: ChildNode;

  protected firstUpdated(): void {
    this.style.position = "relative";
    this.style.display = "block";
  }

  // This is not a lit element, but an updating element, so we implement update
  protected update(changedProps: PropertyValues): void {
    super.update(changedProps);
    const stateObj = this.stateObj;
    const hass = this.hass;

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
      this._detachedChild = undefined;
    }

    const moreInfoType =
      stateObj.attributes && "custom_ui_more_info" in stateObj.attributes
        ? stateObj.attributes.custom_ui_more_info
        : "more-info-" + stateMoreInfoType(stateObj);

    dynamicContentUpdater(this, moreInfoType.toUpperCase(), {
      hass,
      stateObj,
    });
  }
}

customElements.define("more-info-content", MoreInfoContent);
