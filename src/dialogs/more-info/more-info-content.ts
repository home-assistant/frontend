import { HassEntity } from "home-assistant-js-websocket";
import { property, PropertyValues, UpdatingElement } from "lit-element";
import dynamicContentUpdater from "../../common/dom/dynamic_content_updater";
import { stateMoreInfoType } from "../../common/entity/state_more_info_type";
import { HomeAssistant } from "../../types";
import "./controls/more-info-alarm_control_panel";
import "./controls/more-info-automation";
import "./controls/more-info-camera";
import "./controls/more-info-climate";
import "./controls/more-info-configurator";
import "./controls/more-info-counter";
import "./controls/more-info-cover";
import "./controls/more-info-default";
import "./controls/more-info-fan";
import "./controls/more-info-group";
import "./controls/more-info-humidifier";
import "./controls/more-info-input_datetime";
import "./controls/more-info-light";
import "./controls/more-info-lock";
import "./controls/more-info-media_player";
import "./controls/more-info-person";
import "./controls/more-info-script";
import "./controls/more-info-sun";
import "./controls/more-info-timer";
import "./controls/more-info-vacuum";
import "./controls/more-info-water_heater";
import "./controls/more-info-weather";

class MoreInfoContent extends UpdatingElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

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
