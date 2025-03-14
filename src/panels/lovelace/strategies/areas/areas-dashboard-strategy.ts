import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { areaCompare } from "../../../../data/area_registry";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { AreaViewStrategyConfig } from "../area/area-view-strategy";

export interface AreasDashboardStrategyConfig {}

@customElement("areas-dashboard-strategy")
export class AreasDashboardStrategy extends ReactiveElement {
  static async generate(
    _config: AreasDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const compare = areaCompare(hass.areas);
    const areas = Object.values(hass.areas).sort((a, b) =>
      compare(a.area_id, b.area_id)
    );

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
