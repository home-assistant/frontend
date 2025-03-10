import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

export interface AreasViewStrategyConfig {
  type: "areas";
}

@customElement("areas-view-strategy")
export class AreasViewStrategy extends ReactiveElement {
  static async generate(
    _config: AreasViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas).sort((a, b) => {
      const floorA = a.floor_id ? hass.floors[a.floor_id] : null;
      const floorB = b.floor_id ? hass.floors[b.floor_id] : null;
      return -1 * ((floorB?.level ?? Infinity) - (floorA?.level ?? Infinity));
    });

    const areaSections = areas.map<LovelaceSectionConfig>((area) => {
      const areaPath = `areas-${area.area_id}`;
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
              navigation_path: areaPath,
            },
          },
          {
            type: "area",
            area: area.area_id,
            navigation_path: areaPath,
            alert_classes: [],
            sensor_classes: [],
          },
        ],
      };
    });

    return {
      type: "sections",
      max_columns: 3,
      sections: areaSections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "areas-view-strategy": AreasViewStrategy;
  }
}
