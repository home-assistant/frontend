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
    const stateObj = this.stateObj;
    const entry = this.entry;
    const hass = this.hass;
    const editMode = this.editMode;

    let moreInfoType: string | undefined;

    if (!stateObj || !hass) return nothing;
    if (stateObj.attributes && "custom_ui_more_info" in stateObj.attributes) {
      moreInfoType = stateObj.attributes.custom_ui_more_info;
    } else {
      const type = stateMoreInfoType(stateObj);
      importMoreInfoControl(type);
      moreInfoType = type === "hidden" ? undefined : `more-info-${type}`;
    }

    if (!moreInfoType) return nothing;
    return dynamicElement(moreInfoType, {
      hass,
      stateObj,
      entry,
      editMode,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-content": MoreInfoContent;
  }
}
