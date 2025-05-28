import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceStrategyEditor } from "../types";
import type {
  AreaViewStrategyConfig,
  EntitiesDisplay,
} from "./area-view-strategy";
import type { AreasViewStrategyConfig } from "./areas-overview-view-strategy";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helper";

interface AreaOptions {
  groups_options?: Record<string, EntitiesDisplay>;
}

export interface AreasDashboardStrategyConfig {
  type: "areas";
  areas_display?: {
    hidden?: string[];
    order?: string[];
  };
  areas_options?: Record<string, AreaOptions>;
  show_icons?: boolean;
}

@customElement("areas-dashboard-strategy")
export class AreasDashboardStrategy extends ReactiveElement {
  static async generate(
    config: AreasDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    if (hass.config.state === STATE_NOT_RUNNING) {
      return {
        views: [
          {
            type: "sections",
            sections: [{ cards: [{ type: "starting" }] }],
          },
        ],
      };
    }

    if (hass.config.recovery_mode) {
      return {
        views: [
          {
            type: "sections",
            sections: [{ cards: [{ type: "recovery-mode" }] }],
          },
        ],
      };
    }

    const areas = getAreas(
      hass.areas,
      config.areas_display?.hidden,
      config.areas_display?.order
    );

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => {
      const path = computeAreaPath(area.area_id);
      const areaConfig = config.areas_options?.[area.area_id];

      return {
        title: area.name,
        icon: config.show_icons && area.icon ? area.icon : undefined,
        path: path,
        strategy: {
          type: "area",
          area: area.area_id,
          groups_options: areaConfig?.groups_options,
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
            type: "areas-overview",
            areas_display: config.areas_display,
            areas_options: config.areas_options,
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
