import { HassEntity } from "home-assistant-js-websocket";
import { LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ExtEntityRegistryEntry } from "../../data/entity_registry";
import { importMoreInfoControl } from "../../panels/lovelace/custom-card-helpers";
import { HomeAssistant } from "../../types";
import { stateMoreInfoType } from "./state_more_info_control";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";

@customElement("more-info-content")
class MoreInfoContent extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  protected render() {
    let moreInfoType: string | undefined;

    if (!this.stateObj || !this.hass) return nothing;
    if (
      this.stateObj.attributes &&
      "custom_ui_more_info" in this.stateObj.attributes
    ) {
      moreInfoType = this.stateObj.attributes.custom_ui_more_info;
    } else {
      const type = stateMoreInfoType(this.stateObj);
      importMoreInfoControl(type);
      moreInfoType = type === "hidden" ? undefined : `more-info-${type}`;
    }

    if (!moreInfoType) return nothing;
    return dynamicElement(moreInfoType, {
      hass: this.hass,
      stateObj: this.stateObj,
      entry: this.entry,
      editMode: this.editMode,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-content": MoreInfoContent;
  }
}
