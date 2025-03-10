import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { AreaViewStrategyConfig } from "../area/area-view-strategy";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";

export interface AreasDashboardStrategyConfig {}

@customElement("areas-dashboard-strategy")
export class AreasDashboardStrategy extends ReactiveElement {
  static async generate(
    _config: AreasDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const areas = Object.values(hass.areas);

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => ({
      title: area.name,
      icon: area.icon || undefined,
      path: `areas-${area.area_id}`,
      subview: true,
      strategy: {
        type: "area",
        area: area.area_id,
      } satisfies AreaViewStrategyConfig,
    }));

    return {
      views: [
        {
          title: "Home",
          icon: "mdi:home",
          path: "home",
          strategy: {
            type: "areas",
          },
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
