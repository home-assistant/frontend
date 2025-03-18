import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { AreaViewStrategyConfig } from "../area/area-view-strategy";
import type { LovelaceStrategyEditor } from "../types";
import type { AreasViewStrategyConfig } from "./areas-view-strategy";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helpers";

export interface AreasDashboardStrategyConfig {
  type: "areas";
  areas_display?: {
    hidden?: string[];
    order?: string[];
  };
  areas?: Record<
    string,
    {
      groups?: Record<
        string,
        {
          hidden?: string[];
          order?: string[];
        }
      >;
    }
  >;
}

@customElement("areas-dashboard-strategy")
export class AreasDashboardStrategy extends ReactiveElement {
  static async generate(
    config: AreasDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const areas = getAreas(
      hass.areas,
      config.areas_display?.hidden,
      config.areas_display?.order
    );

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => {
      const path = computeAreaPath(area.area_id);
      return {
        title: area.name,
        icon: area.icon || undefined,
        path: path,
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
            areas_display: config.areas_display,
          } satisfies AreasViewStrategyConfig,
        },
        ...areaViews,
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import("./editor/hui-areas-dashboard-strategy-editor");
    return document.createElement("hui-areas-dashboard-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "areas-dashboard-strategy": AreasDashboardStrategy;
  }
}
