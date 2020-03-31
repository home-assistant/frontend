import { customElement } from "lit-element";
import { HassEntity } from "home-assistant-js-websocket/dist/types";

import { LovelaceCardEditor } from "../types";
import { HomeAssistant } from "../../../types";
import { SensorCardConfig, EntityCardConfig } from "./types";
import { GraphHeaderFooterConfig } from "../header-footer/types";
import { findEntities } from "../common/find-entites";
import { HuiEntityCard } from "./hui-entity-card";

@customElement("hui-sensor-card")
class HuiSensorCard extends HuiEntityCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-sensor-card-editor" */ "../editor/config-elements/hui-sensor-card-editor"
    );
    return document.createElement("hui-sensor-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): SensorCardConfig {
    const includeDomains = ["sensor"];
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean => {
      return (
        !isNaN(Number(stateObj.state)) &&
        !!stateObj.attributes.unit_of_measurement
      );
    };

    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return { type: "sensor", entity: foundEntities[0] || "", graph: "line" };
  }

  public setConfig(config: SensorCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "sensor") {
      throw new Error("Specify an entity from within the sensor domain.");
    }

    const entityCardConfig: EntityCardConfig = {
      type: "entity",
      entity: config.entity,
      ...(config.theme && { theme: config.theme }),
      ...(config.name && { name: config.name }),
      ...(config.unit && { unit: config.unit }),
      ...(config.icon && { icon: config.icon }),
    };

    if (config.graph === "line") {
      const footerConfig: GraphHeaderFooterConfig = {
        type: "graph",
        entity: config.entity,
        detail: config.detail || 1,
        hours_to_show: config.hours_to_show || 24,
      };

      entityCardConfig.footer = footerConfig;
    }

    super.setConfig(entityCardConfig);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-card": HuiSensorCard;
  }
}
