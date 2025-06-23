import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { stringCompare } from "../../../../common/string/compare";
import { floorDefaultIcon } from "../../../../components/ha-floor-icon";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { getAreaControlEntities } from "../../card-features/hui-area-controls-card-feature";
import type { AreaControl } from "../../card-features/types";
import type { AreaCardConfig, HeadingCardConfig } from "../../cards/types";
import type { EntitiesDisplay } from "./area-view-strategy";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helper";

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

    const floors = Object.values(hass.floors);
    floors.sort((floorA, floorB) => {
      if (floorA.level !== floorB.level) {
        return (floorA.level ?? 0) - (floorB.level ?? 0);
      }
      return stringCompare(floorA.name, floorB.name);
    });

    const floorSections = [
      ...floors,
      { floor_id: "default", name: "Default", level: null, icon: null },
    ]
      .map<LovelaceSectionConfig | undefined>((floor) => {
        const areasInFloors = areas.filter(
          (area) =>
            area.floor_id === floor.floor_id ||
            (!area.floor_id && floor.floor_id === "default")
        );

        if (areasInFloors.length === 0) {
          return undefined;
        }

        const areasCards = areasInFloors.map<AreaCardConfig>((area) => {
          const path = computeAreaPath(area.area_id);

          const controls: AreaControl[] = ["light", "fan"];
          const controlEntities = getAreaControlEntities(
            controls,
            area.area_id,
            hass
          );

          const filteredControls = controls.filter(
            (control) => controlEntities[control].length > 0
          );

          return {
            type: "area",
            area: area.area_id,
            display_type: "compact",
            sensor_classes: ["temperature", "humidity"],
            alert_classes: [
              "water_leak",
              "smoke",
              "gas",
              "co",
              "motion",
              "occupancy",
              "presence",
            ],
            features: filteredControls.length
              ? [
                  {
                    type: "area-controls",
                    controls: filteredControls,
                  },
                ]
              : [],
            navigation_path: path,
          };
        });

        const headingCard: HeadingCardConfig = {
          type: "heading",
          heading_style: "title",
          heading: floor.name,
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
