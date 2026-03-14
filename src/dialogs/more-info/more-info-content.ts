import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import type { EntityNameItem } from "../../common/entity/compute_entity_name_display";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import "../../components/ha-badge";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import { supportsCoverPositionCardFeature } from "../../panels/lovelace/card-features/hui-cover-position-card-feature";
import { supportsLightBrightnessCardFeature } from "../../panels/lovelace/card-features/hui-light-brightness-card-feature";
import type { LovelaceCardFeatureConfig } from "../../panels/lovelace/card-features/types";
import type { TileCardConfig } from "../../panels/lovelace/cards/types";
import { importMoreInfoControl } from "../../panels/lovelace/custom-card-helpers";
import "../../panels/lovelace/sections/hui-section";
import type { HomeAssistant } from "../../types";
import { stateMoreInfoType } from "./state_more_info_control";

interface EntityInfo {
  entityId: string;
  entityName: string | undefined;
  areaId: string | undefined;
}

@customElement("more-info-content")
class MoreInfoContent extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @property({ attribute: false }) public data?: Record<string, any>;

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
        data: this.data,
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
      Array.isArray(stateObj.attributes.entity_id) &&
      stateObj.attributes.entity_id.some(
        (entityId: string) => !this.hass!.entities[entityId]?.hidden
      )
    );
  }

  private _entitiesSectionConfig = memoizeOne((entityIds: string[]) => {
    const hass = this.hass!;

    // Get entity names and areas for all visible entities
    const entityInfos = entityIds
      .map<EntityInfo | null>((entityId) => {
        const entry = hass.entities[entityId];
        if (entry?.hidden) {
          return null;
        }
        const stateObj = hass.states[entityId];
        if (!stateObj) {
          return null;
        }
        const entityName = entry
          ? computeEntityName(stateObj, hass.entities, hass.devices)
          : undefined;
        const { area } = getEntityContext(
          stateObj,
          hass.entities,
          hass.devices,
          hass.areas,
          hass.floors
        );
        const areaId = area?.area_id;
        return { entityId, entityName, areaId };
      })
      .filter(Boolean) as EntityInfo[];

    // Check if all entities have the same entity name
    const entityNames = new Set(entityInfos.map((info) => info.entityName));
    const allSameEntityName = entityNames.size === 1;

    // Check if all entities have the same area
    const areaIds = new Set(entityInfos.map((info) => info.areaId));
    const allSameArea = areaIds.size === 1;

    // Build name and state content config based on conditions
    const name: EntityNameItem[] = [{ type: "device" }];

    if (!allSameEntityName) {
      name.push({ type: "entity" });
    }

    const stateContent = ["state"];
    if (!allSameArea) {
      stateContent.push("area_name");
    }

    const cards = entityInfos.map(({ entityId }) => {
      const features: LovelaceCardFeatureConfig[] = [];
      const context = { entity_id: entityId };
      if (supportsCoverPositionCardFeature(hass, context)) {
        features.push({
          type: "cover-position",
        });
      } else if (supportsLightBrightnessCardFeature(hass, context)) {
        features.push({
          type: "light-brightness",
        });
      }

      return {
        type: "tile",
        entity: entityId,
        name,
        state_content: stateContent,
        features_position: "inline",
        features,
        grid_options: { columns: 12 },
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
      margin-top: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-content": MoreInfoContent;
  }
}
