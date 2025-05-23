import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesDisplay } from "./area-view-strategy";
import {
  computeAreaPath,
  computeAreaTileCardConfig,
  getAreaGroupedEntities,
  getAreas,
} from "./helpers/areas-strategy-helper";

interface AreaOptions {
  groups_options?: Record<string, EntitiesDisplay>;
}

export interface AreasViewStrategyConfig {
  type: "areas-overview";
  areas_display?: {
    hidden?: string[];
    order?: string[];
  };
  areas_options?: Record<string, AreaOptions>;
}

@customElement("areas-overview-view-strategy")
export class AreasOverviewViewStrategy extends ReactiveElement {
  static async generate(
    config: AreasViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(
      hass.areas,
      config.areas_display?.hidden,
      config.areas_display?.order
    );

    const areaSections = areas
      .map<LovelaceSectionConfig | undefined>((area) => {
        const path = computeAreaPath(area.area_id);

        const areaConfig = config.areas_options?.[area.area_id];

        const groups = getAreaGroupedEntities(
          area.area_id,
          hass,
          areaConfig?.groups_options
        );

        const entities = [
          ...groups.lights,
          ...groups.covers,
          ...groups.climate,
          ...groups.media_players,
          ...groups.security,
          ...groups.actions,
          ...groups.others,
        ];

        const computeTileCard = computeAreaTileCardConfig(hass, area.name);

        return {
          type: "grid",
          cards: [
            {
              type: "heading",
              heading: area.name,
              icon: area.icon || undefined,
              badges: [
                ...(area.temperature_entity_id
                  ? [{ entity: area.temperature_entity_id }]
                  : []),
                ...(area.humidity_entity_id
                  ? [{ entity: area.humidity_entity_id }]
                  : []),
              ],
              tap_action: {
                action: "navigate",
                navigation_path: path,
              },
            },
            ...(entities.length
              ? entities.map(computeTileCard)
              : [
                  {
                    type: "markdown",
                    content: hass.localize(
                      "ui.panel.lovelace.strategy.areas.no_entities"
                    ),
                  },
                ]),
          ],
        };
      })
      .filter(
        (section): section is LovelaceSectionConfig => section !== undefined
      );

    return {
      type: "sections",
      max_columns: 3,
      sections: areaSections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "areas-overview-view-strategy": AreasOverviewViewStrategy;
  }
}
