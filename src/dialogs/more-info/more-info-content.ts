import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import "../../components/ha-badge";
import type { ExtEntityRegistryEntry } from "../../data/entity_registry";
import type { TileCardConfig } from "../../panels/lovelace/cards/types";
import { importMoreInfoControl } from "../../panels/lovelace/custom-card-helpers";
import "../../panels/lovelace/sections/hui-section";
import type { HomeAssistant } from "../../types";
import { stateMoreInfoType } from "./state_more_info_control";
import type { LovelaceCardFeatureConfig } from "../../panels/lovelace/card-features/types";
import { supportsLightBrightnessCardFeature } from "../../panels/lovelace/card-features/hui-light-brightness-card-feature";
import { supportsCoverPositionCardFeature } from "../../panels/lovelace/card-features/hui-cover-position-card-feature";

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

    return html`
      ${dynamicElement(moreInfoType, {
        hass: this.hass,
        stateObj: this.stateObj,
        entry: this.entry,
        editMode: this.editMode,
      })}
      ${this._showEntityMembers(this.stateObj)
        ? html`
            <hui-section
              .hass=${this.hass}
              .config=${this._entitiesSectionConfig(
                this.stateObj.attributes.entity_id
              )}
            >
            </hui-section>
          `
        : nothing}
    `;
  }

  private _showEntityMembers(stateObj: HassEntity): boolean {
    if (computeStateDomain(stateObj) === "group") {
      // Don't show entity members for legacy groups as they already show
      // the members in their more info dialog.
      return false;
    }
    return (
      stateObj.attributes &&
      stateObj.attributes.entity_id &&
      Array.isArray(stateObj.attributes.entity_id)
    );
  }

  private _entitiesSectionConfig = memoizeOne((entityIds: string[]) => {
    const cards = entityIds.map((entityId) => {
      const features: LovelaceCardFeatureConfig[] = [];
      const context = { entity_id: entityId };
      if (supportsCoverPositionCardFeature(this.hass!, context)) {
        features.push({
          type: "cover-position",
        });
      } else if (supportsLightBrightnessCardFeature(this.hass!, context)) {
        features.push({
          type: "light-brightness",
        });
      }
      return {
        type: "tile",
        entity: entityId,
        features_position: "inline",
        features,
      } as TileCardConfig;
    });
    return {
      type: "grid",
      cards,
    };
  });

  static styles = css`
    hui-section {
      width: 100%;
      display: block;
      margin-top: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-content": MoreInfoContent;
  }
}
