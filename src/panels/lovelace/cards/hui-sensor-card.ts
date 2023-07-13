import { css, CSSResultGroup } from "lit";
import { HassEntity } from "home-assistant-js-websocket/dist/types";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { GraphHeaderFooterConfig } from "../header-footer/types";
import { LovelaceCardEditor } from "../types";
import { HuiEntityCard } from "./hui-entity-card";
import { EntityCardConfig, SensorCardConfig } from "./types";

const includeDomains = ["counter", "input_number", "number", "sensor"];

export const DEFAULT_HOURS_TO_SHOW = 24;

@customElement("hui-sensor-card")
class HuiSensorCard extends HuiEntityCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-sensor-card-editor");
    return document.createElement("hui-sensor-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): SensorCardConfig {
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isNaN(Number(stateObj.state)) &&
      !!stateObj.attributes.unit_of_measurement;

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
    if (
      !config.entity ||
      !includeDomains.includes(computeDomain(config.entity))
    ) {
      throw new Error("Specify an entity from within the sensor domain");
    }

    const { graph, detail, hours_to_show, ...cardConfig } = config;

    const entityCardConfig: EntityCardConfig = {
      ...cardConfig,
      type: "entity",
    };

    if (graph === "line") {
      const footerConfig: GraphHeaderFooterConfig = {
        type: "graph",
        entity: config.entity,
        detail: detail || 1,
        hours_to_show: hours_to_show || DEFAULT_HOURS_TO_SHOW,
        limits: config.limits!,
      };

      entityCardConfig.footer = footerConfig;
    }

    super.setConfig(entityCardConfig);
  }

  static get styles(): CSSResultGroup {
    return [
      HuiEntityCard.styles,
      css`
        ha-card {
          overflow: hidden;
        }
        .info {
          direction: ltr;
          text-align: var(--float-start);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-card": HuiSensorCard;
  }
}
