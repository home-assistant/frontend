import { HassEntity } from "home-assistant-js-websocket";
import { property, PropertyValues, UpdatingElement } from "lit-element";

import { HomeAssistant } from "../../types";
import dynamicContentUpdater from "../../common/dom/dynamic_content_updater";
import { stateMoreInfoType } from "./state_more_info_control";
import { importMoreInfoControl } from "../../panels/lovelace/custom-card-helpers";

class MoreInfoContent extends UpdatingElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public stateObj?: HassEntity;

  private _detachedChild?: ChildNode;

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

    let moreInfoType: string | undefined;

    if (stateObj.attributes && "custom_ui_more_info" in stateObj.attributes) {
      moreInfoType = stateObj.attributes.custom_ui_more_info;
    } else {
      const type = stateMoreInfoType(stateObj);
      importMoreInfoControl(type);
      moreInfoType = type === "hidden" ? undefined : `more-info-${type}`;
    }

    if (!moreInfoType) {
      return;
    }

    dynamicContentUpdater(this, moreInfoType.toUpperCase(), {
      hass,
      stateObj,
    });
  }
}

customElements.define("more-info-content", MoreInfoContent);
