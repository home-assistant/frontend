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

interface EntityFilterConfig {
  title?: string;
  icon?: string;
  filter?: EntityFilter | EntityFilter[];
  include_entities?: string[];
  exclude_entities?: string[];
  order?: string[];
}

export type EntitiesFilterSectionStrategyConfig = EntityFilterConfig & {
  type: "entities-filter";
  groups?: EntityFilterConfig[];
};

const getEntities = (hass: HomeAssistant, config: EntityFilterConfig) => {
  let entitiesIds =
    config.filter || config.exclude_entities ? Object.keys(hass.states) : [];

  if (config.exclude_entities) {
    entitiesIds = entitiesIds.filter(
      (entityId) => !config.exclude_entities!.includes(entityId)
    );
  }

  if (config.filter) {
    const filters = ensureArray(config.filter);
    const entityFilters = filters.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    entitiesIds = entitiesIds.filter((entityId) =>
      entityFilters.some((filter) => filter(entityId))
    );
  }

  if (config.include_entities) {
    entitiesIds.push(...config.include_entities);
  }

  if (config.order) {
    entitiesIds.sort((a, b) => {
      const aIndex = config.order!.indexOf(a);
      const bIndex = config.order!.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }

  return entitiesIds;
};

@customElement("entities-filter-section-strategy")
export class EntitiesFilterSectionStrategy extends ReactiveElement {
  static async generate(
    config: EntitiesFilterSectionStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceSectionConfig> {
    const cards: LovelaceCardConfig[] = [];
    let isEmpty = true;

    if (config.title) {
      const headingCard: HeadingCardConfig = {
        type: "heading",
        heading: config.title,
        heading_style: "title",
        icon: config.icon,
      };
      cards.push(headingCard);
    }

    const entities = getEntities(hass, config);

    if (entities.length > 0) {
      isEmpty = false;
      for (const entityId of entities) {
        const tileCard: TileCardConfig = {
          type: "tile",
          entity: entityId,
        };
        cards.push(tileCard);
      }
    }

    if (config.groups) {
      for (const group of config.groups) {
        const groupEntities = getEntities(hass, group);

        if (groupEntities.length > 0) {
          isEmpty = false;
          if (group.title) {
            cards.push({
              type: "heading",
              heading: group.title,
              heading_style: "subtitle",
              icon: group.icon,
            });
          }

          for (const entityId of groupEntities) {
            const tileCard: TileCardConfig = {
              type: "tile",
              entity: entityId,
            };
            cards.push(tileCard);
          }
        }
      }
    }

    if (isEmpty) {
      cards.push({
        type: "markdown",
        content: "No entities found.",
      });
    }

    return {
      type: "grid",
      cards: cards,
      hidden: isEmpty,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entities-filter-section-strategy": EntitiesFilterSectionStrategy;
  }
}
