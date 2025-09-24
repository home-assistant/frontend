import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { getCommonControlUsagePrediction } from "../../../../data/usage_prediction";
import type { HomeAssistant } from "../../../../types";
import type { TileCardConfig } from "../../cards/types";

const DEFAULT_LIMIT = 8;

export interface CommonControlSectionStrategyConfig {
  type: "common-controls";
  title?: string;
  limit?: number;
  exclude_entities?: string[];
  hide_empty?: boolean;
}

@customElement("common-controls-section-strategy")
export class CommonControlsSectionStrategy extends ReactiveElement {
  static async generate(
    config: CommonControlSectionStrategyConfig,
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
        content: hass.localize(
          "ui.panel.lovelace.strategy.common_controls.not_loaded"
        ),
      });
      section.disabled = config.hide_empty;
      return section;
    }

    const predictedCommonControl = await getCommonControlUsagePrediction(hass);
    let predictedEntities = predictedCommonControl.entities;

    if (config.exclude_entities) {
      predictedEntities = predictedEntities.filter(
        (entity) => !config.exclude_entities!.includes(entity)
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
            }) satisfies TileCardConfig
        )
      );
    } else {
      section.cards!.push({
        type: "markdown",
        content: hass.localize(
          "ui.panel.lovelace.strategy.common_controls.no_data"
        ),
      });
      section.disabled = config.hide_empty;
    }

    return section;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "common-controls-section-strategy": CommonControlsSectionStrategy;
  }
}
