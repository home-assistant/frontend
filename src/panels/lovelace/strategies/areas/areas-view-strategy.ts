import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helpers";

export interface AreasViewStrategyConfig {
  type: "areas";
  areas_display?: {
    hidden?: string[];
    order?: string[];
  };
}

@customElement("areas-view-strategy")
export class AreasViewStrategy extends ReactiveElement {
  static async generate(
    config: AreasViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = getAreas(
      hass.areas,
      config.areas_display?.hidden,
      config.areas_display?.order
    );

    const areaSections = areas.map<LovelaceSectionConfig>((area) => {
      const path = computeAreaPath(area.area_id);
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
          {
            type: "area",
            area: area.area_id,
            navigation_path: path,
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
