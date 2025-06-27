import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { stringCompare } from "../../../../common/string/compare";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { getAreaControlEntities } from "../../card-features/hui-area-controls-card-feature";
import { AREA_CONTROLS, type AreaControl } from "../../card-features/types";
import type { AreaCardConfig, HeadingCardConfig } from "../../cards/types";
import type { EntitiesDisplay } from "./area-view-strategy";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helper";

const UNASSIGNED_FLOOR = "__unassigned__";

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
    const displayedAreas = getAreas(
      hass.areas,
      config.areas_display?.hidden,
      config.areas_display?.order
    );

    const floors = Object.values(hass.floors);
    floors.sort((floorA, floorB) => {
      if (floorA.level !== floorB.level) {
        return (floorA.level ?? 0) - (floorB.level ?? 0);
      }
      return stringCompare(floorA.name, floorB.name);
    });

    const floorSections = [
      ...floors,
      {
        floor_id: UNASSIGNED_FLOOR,
        name: hass.localize("ui.panel.lovelace.strategy.areas.others_areas"),
        level: null,
        icon: null,
      },
    ]
      .map((floor) => {
        const areasInFloors = displayedAreas.filter(
          (area) =>
            area.floor_id === floor.floor_id ||
            (!area.floor_id && floor.floor_id === UNASSIGNED_FLOOR)
        );

        return [floor, areasInFloors] as const;
      })
      .filter(([_, areas]) => areas.length)
      .map<LovelaceSectionConfig | undefined>(([floor, areas], _, array) => {
        const areasCards = areas.map<AreaCardConfig>((area) => {
          const path = computeAreaPath(area.area_id);

          const areaOptions = config.areas_options?.[area.area_id] || {};

          const hiddenEntities = Object.values(areaOptions.groups_options || {})
            .map((display) => display.hidden || [])
            .flat();

          const controls: AreaControl[] = AREA_CONTROLS.filter(
            (a) => a !== "switch" // Exclude switches control for areas as we don't know what the switches control
          );
          const controlEntities = getAreaControlEntities(
            controls,
            area.area_id,
            hiddenEntities,
            hass
          );

          const filteredControls = controls.filter(
            (control) => controlEntities[control].length > 0
          );

          const sensorClasses: string[] = [];
          if (area.temperature_entity_id) {
            sensorClasses.push("temperature");
          }
          if (area.humidity_entity_id) {
            sensorClasses.push("humidity");
          }

          return {
            type: "area",
            area: area.area_id,
            display_type: "compact",
            sensor_classes: sensorClasses,
            exclude_entities: hiddenEntities,
            features: filteredControls.length
              ? [
                  {
                    type: "area-controls",
                    controls: filteredControls,
                  },
                ]
              : [],
            grid_options: {
              rows: 1,
              columns: 12,
            },
            features_position: "inline",
            navigation_path: path,
          };
        });

        const noFloors =
          array.length === 1 && floor.floor_id === UNASSIGNED_FLOOR;

        const headingTitle = noFloors
          ? hass.localize("ui.panel.lovelace.strategy.areas.areas")
          : floor.name;

        const headingCard: HeadingCardConfig = {
          type: "heading",
          heading_style: "title",
          heading: headingTitle,
          icon: floor.icon || floorDefaultIcon(floor),
        };

        return {
          max_columns: 3,
          type: "grid",
          cards: [headingCard, ...areasCards],
        };
      })
      ?.filter((section) => section !== undefined);

    return {
      type: "sections",
      max_columns: 3,
      sections: floorSections || [],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "areas-overview-view-strategy": AreasOverviewViewStrategy;
  }
}
