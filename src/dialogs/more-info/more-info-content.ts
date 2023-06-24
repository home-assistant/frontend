import { HassEntity } from "home-assistant-js-websocket";
import { PropertyValues, ReactiveElement } from "lit";
import { property } from "lit/decorators";
import dynamicContentUpdater from "../../common/dom/dynamic_content_updater";
import { ExtEntityRegistryEntry } from "../../data/entity_registry";
import { importMoreInfoControl } from "../../panels/lovelace/custom-card-helpers";
import { HomeAssistant } from "../../types";
import { stateMoreInfoType } from "./state_more_info_control";

class MoreInfoContent extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  private _detachedChild?: ChildNode;

  protected createRenderRoot() {
    return this;
  }

  // This is not a lit element, but an updating element, so we implement update
  protected update(changedProps: PropertyValues): void {
    super.update(changedProps);
    const stateObj = this.stateObj;
    const entry = this.entry;
    const hass = this.hass;
    const editMode = this.editMode;

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
      if (this.lastChild) {
        this.removeChild(this.lastChild);
      }
      return;
    }

    dynamicContentUpdater(this, moreInfoType.toUpperCase(), {
      hass,
      stateObj,
      entry,
      editMode,
    });
  }
}

customElements.define("more-info-content", MoreInfoContent);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-content": MoreInfoContent;
  }
}
