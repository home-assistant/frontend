import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  generateEntityFilter,
  type EntityFilter,
} from "../../../../common/entity/entity_filter";
import type { TileCardConfig, HeadingCardConfig } from "../../cards/types";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { ensureArray } from "../../../../common/array/ensure-array";

export interface EntitiesFilterSectionStrategyConfig {
  title?: string;
  icon?: string;
  filter?: EntityFilter | EntityFilter[];
  includes?: string[];
  excludes?: string[];
  order?: string[];
}

@customElement("entities-filter-section-strategy")
export class EntitiesFilterSectionStrategy extends ReactiveElement {
  static async generate(
    config: EntitiesFilterSectionStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceSectionConfig> {
    const cards: LovelaceCardConfig[] = [];

    if (config.title) {
      const headingCard: HeadingCardConfig = {
        type: "heading",
        heading: config.title,
        heading_style: "title",
        icon: config.icon,
      };
      cards.push(headingCard);
    }

    const filters = ensureArray(config.filter) ?? [];
    if (filters.length > 0 || config.includes || config.excludes) {
      const entityFilters = filters.map((filter) =>
        generateEntityFilter(hass, filter)
      );

      let entitiesIds = Object.keys(hass.states).filter((entityId) =>
        entityFilters.some((filter) => filter(entityId))
      );

      if (config.excludes) {
        entitiesIds = entitiesIds.filter(
          (entityId) => !config.excludes!.includes(entityId)
        );
      }
      if (config.includes) {
        entitiesIds.push(...config.includes);
      }

      if (config.order) {
        entitiesIds.sort((a, b) => {
          const aIndex = config.order!.indexOf(a);
          const bIndex = config.order!.indexOf(b);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      }

      const entitiesCards = entitiesIds.map<TileCardConfig>((entityId) => ({
        type: "tile",
        entity: entityId,
      }));

      cards.push(...entitiesCards);
    }

    return {
      type: "grid",
      cards: cards,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entities-filter-section-strategy": EntitiesFilterSectionStrategy;
  }
}
