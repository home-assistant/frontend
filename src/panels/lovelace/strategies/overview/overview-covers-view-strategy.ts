import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import {
  computeAreaTileCardConfig,
  getAreas,
  getFloors,
} from "../areas/helpers/areas-strategy-helper";

export interface OverviewCoversViewStrategyConfig {
  type: "overview-covers";
}

const UNASSIGNED_FLOOR = "__unassigned__";

@customElement("overview-covers-view-strategy")
export class OverviewCoversViewStrategy extends ReactiveElement {
  static async generate(
    _config: OverviewCoversViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(hass.areas);

    const floors = getFloors(hass.floors);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const coverFilter = generateEntityFilter(hass, {
      domain: "cover",
      entity_category: "none",
    });

    const binarySensorFilter = generateEntityFilter(hass, {
      domain: "binary_sensor",
      device_class: ["door", "garage_door", "window"],
      entity_category: "none",
    });

    const coverEntities = allEntities.filter(coverFilter);
    const binarySensorEntities = allEntities.filter(binarySensorFilter);

    const entities = [...coverEntities, ...binarySensorEntities];

    const allFloors = [
      ...floors,
      {
        floor_id: UNASSIGNED_FLOOR,
        name: hass.localize("ui.panel.lovelace.strategy.areas.other_areas"),
        level: null,
        icon: null,
      },
    ];

    for (const floor of allFloors) {
      let hasCover = false;

      const areasInFloor = areas.filter(
        (area) =>
          area.floor_id === floor.floor_id ||
          (!area.floor_id && floor.floor_id === UNASSIGNED_FLOOR)
      );

      const noFloors =
        floors.length === 0 && floor.floor_id === UNASSIGNED_FLOOR;

      const headingTitle = noFloors
        ? hass.localize("ui.panel.lovelace.strategy.areas.areas")
        : floor.name;

      const section: LovelaceSectionRawConfig = {
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: headingTitle,
            icon: floor.icon || floorDefaultIcon(floor) || "mdi:home-floor",
          },
        ],
      };

      for (const area of areasInFloor) {
        const areaFilter = generateEntityFilter(hass, {
          area: area.area_id,
        });
        const areaEntities = entities.filter(areaFilter);

        if (areaEntities.length > 0) {
          hasCover = true;
          section.cards!.push({
            heading_style: "subtitle",
            type: "heading",
            heading: area.name,
            icon: area.icon || "mdi:home",
            tap_action: {
              action: "navigate",
              navigation_path: `areas-${area.area_id}`,
            },
          });

          const computeTileCard = computeAreaTileCardConfig(
            hass,
            area.name,
            true
          );

          for (const entityId of areaEntities) {
            section.cards!.push(computeTileCard(entityId));
          }
        }
      }

      if (hasCover) {
        sections.push(section);
      }
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(sections.length, 2, 3);

    // Take the full width if there is only one section to avoid narrow header on desktop
    if (sections.length === 1) {
      sections[0].column_span = 2;
    }

    return {
      type: "sections",
      max_columns: maxColumns,
      sections: sections || [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "overview-covers-view-strategy": OverviewCoversViewStrategy;
  }
}
