import { HassEntity } from "home-assistant-js-websocket";
import { property, PropertyValues, UpdatingElement } from "lit-element";
import dynamicContentUpdater from "../../../src/common/dom/dynamic_content_updater";
import { stateMoreInfoType } from "../../../src/common/entity/state_more_info_type";
import "../../../src/dialogs/more-info/controls/more-info-alarm_control_panel";
import "../../../src/dialogs/more-info/controls/more-info-automation";
import "../../../src/dialogs/more-info/controls/more-info-camera";
import "../../../src/dialogs/more-info/controls/more-info-climate";
import "../../../src/dialogs/more-info/controls/more-info-configurator";
import "../../../src/dialogs/more-info/controls/more-info-counter";
import "../../../src/dialogs/more-info/controls/more-info-cover";
import "../../../src/dialogs/more-info/controls/more-info-default";
import "../../../src/dialogs/more-info/controls/more-info-fan";
import "../../../src/dialogs/more-info/controls/more-info-group";
import "../../../src/dialogs/more-info/controls/more-info-humidifier";
import "../../../src/dialogs/more-info/controls/more-info-input_datetime";
import "../../../src/dialogs/more-info/controls/more-info-light";
import "../../../src/dialogs/more-info/controls/more-info-lock";
import "../../../src/dialogs/more-info/controls/more-info-media_player";
import "../../../src/dialogs/more-info/controls/more-info-person";
import "../../../src/dialogs/more-info/controls/more-info-script";
import "../../../src/dialogs/more-info/controls/more-info-sun";
import "../../../src/dialogs/more-info/controls/more-info-timer";
import "../../../src/dialogs/more-info/controls/more-info-vacuum";
import "../../../src/dialogs/more-info/controls/more-info-water_heater";
import "../../../src/dialogs/more-info/controls/more-info-weather";
import { HomeAssistant } from "../../../src/types";

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
