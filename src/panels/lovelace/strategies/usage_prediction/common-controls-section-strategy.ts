import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { getCommonControlUsagePrediction } from "../../../../data/usage_prediction";
import type { HomeAssistant } from "../../../../types";
import type { TileCardConfig } from "../../cards/types";

const DEFAULT_LIMIT = 8;

export interface OriginalStatesViewStrategyConfig {
  type: "common-controls";
  title?: string;
  limit?: number;
  exclude_entities?: string[];
}

@customElement("common-controls-section-strategy")
export class CommonControlsSectionStrategy extends ReactiveElement {
  static async generate(
    config: OriginalStatesViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceSectionConfig> {
    const section: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };

    if (config.title) {
      section.cards?.push({
        type: "heading",
        heading: config.title,
      });
    }

    if (!isComponentLoaded(hass, "usage_prediction")) {
      section.cards!.push({
        type: "markdown",
        content: "Usage Prediction integration is not loaded.",
      });
      return section;
    }

    const predictedCommonControl = await getCommonControlUsagePrediction(hass);
    let predictedEntities = predictedCommonControl.entities;

    if (config.exclude_entities) {
      predictedEntities = predictedEntities.filter(
        (entity) => !config.exclude_entities?.includes(entity)
      );
    }

    const limit = config.limit ?? DEFAULT_LIMIT;
    predictedEntities = predictedEntities.slice(0, limit);

    if (predictedEntities.length > 0) {
      section.cards!.push(
        ...predictedEntities.map(
          (entityId) =>
            ({
              type: "tile",
              entity: entityId,
              show_entity_picture: true,
            }) as TileCardConfig
        )
      );
    } else {
      section.cards!.push({
        type: "markdown",
        content: "Not enough data yet to show common controls.",
      });
    }

    return section;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "common-controls-section-strategy": CommonControlsSectionStrategy;
  }
}
