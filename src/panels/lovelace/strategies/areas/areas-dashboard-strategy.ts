import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { AreaViewStrategyConfig } from "../area/area-view-strategy";
import type { AreasViewStrategyConfig } from "./areas-view-strategy";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helpers";

export interface AreasDashboardStrategyConfig {
  type: "areas";
  hidden_areas?: string[];
  areas_order?: string[];
}

@customElement("areas-dashboard-strategy")
export class AreasDashboardStrategy extends ReactiveElement {
  static async generate(
    config: AreasDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const areas = getAreas(hass.areas, config.hidden_areas, config.areas_order);

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => {
      const path = computeAreaPath(area.area_id);
      return {
        title: area.name,
        icon: area.icon || undefined,
        path: path,
        subview: true,
        strategy: {
          type: "area",
          area: area.area_id,
        } satisfies AreaViewStrategyConfig,
      };
    });

    return {
      views: [
        {
          title: "Home",
          icon: "mdi:home",
          path: "home",
          strategy: {
            type: "areas",
            areas_order: config.areas_order,
            hidden_areas: config.hidden_areas,
          } satisfies AreasViewStrategyConfig,
        },
        ...areaViews,
      ],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "areas-dashboard-strategy": AreasDashboardStrategy;
  }
}
