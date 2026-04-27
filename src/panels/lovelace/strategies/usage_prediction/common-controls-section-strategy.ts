import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { getCommonControlsUsagePrediction } from "../../../../data/usage_prediction";
import type { HomeAssistant } from "../../../../types";
import type { HeadingCardConfig, TileCardConfig } from "../../cards/types";
import type { Condition } from "../../common/validate-condition";

const DEFAULT_LIMIT = 8;

export interface CommonControlsSectionStrategyConfig {
  type: "common-controls";
  limit?: number;
  exclude_entities?: string[];
  include_entities?: string[];
  hide_empty?: boolean;
  heading?: HeadingCardConfig;
  /** @deprecated Use `heading` instead */
  icon?: string;
  /** @deprecated Use `heading` instead */
  title?: string;
  /** @deprecated Use `heading` instead */
  title_visibilty?: Condition[];
}

const toTileCard = (entity: string): TileCardConfig => ({
  type: "tile",
  entity,
  state_content: ["state", "area_name"],
  show_entity_picture: true,
});

@customElement("common-controls-section-strategy")
export class CommonControlsSectionStrategy extends ReactiveElement {
  static async generate(
    config: CommonControlsSectionStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceSectionConfig> {
    const section: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };

    if (config.heading) {
      section.cards?.push(config.heading);
    } else if (config.title) {
      section.cards?.push({
        type: "heading",
        heading: config.title,
        icon: config.icon,
        visibility: config.title_visibilty,
      } satisfies HeadingCardConfig);
    }

    const limit = config.limit ?? DEFAULT_LIMIT;
    const includedEntities = (config.include_entities || []).filter(
      (entity) => entity in hass.states
    );

    // Pinned entities already fill the section, skip the prediction call.
    if (includedEntities.length >= limit) {
      section.cards!.push(...includedEntities.slice(0, limit).map(toTileCard));
      return section;
    }

    if (!isComponentLoaded(hass.config, "usage_prediction")) {
      section.cards!.push({
        type: "markdown",
        content: hass.localize(
          "ui.panel.lovelace.strategy.common_controls.not_loaded"
        ),
      });
      section.disabled = config.hide_empty;
      return section;
    }

    const predictedCommonControls =
      await getCommonControlsUsagePrediction(hass);
    const predictedEntities = predictedCommonControls.entities.filter(
      (entity) => {
        // Non-existing entities should not be shown
        if (!(entity in hass.states)) return false;
        // Hidden entities should not be shown
        if (hass.entities[entity]?.hidden) return false;
        // Entities explicitly excluded by the user should not be shown
        if (config.exclude_entities?.includes(entity)) return false;
        // Avoid duplicates with the included entities
        if (includedEntities.includes(entity)) return false;
        return true;
      }
    );

    const entities = [...includedEntities, ...predictedEntities].slice(
      0,
      limit
    );

    if (entities.length === 0) {
      section.cards!.push({
        type: "markdown",
        content: hass.localize(
          "ui.panel.lovelace.strategy.common_controls.no_data"
        ),
      });
      section.disabled = config.hide_empty;
      return section;
    }

    section.cards!.push(...entities.map(toTileCard));
    return section;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "common-controls-section-strategy": CommonControlsSectionStrategy;
  }
}
