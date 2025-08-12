import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import {
  AREA_STRATEGY_GROUP_ICONS,
  getAreas,
} from "../areas/helpers/areas-strategy-helper";
import type { OverviewAreaViewStrategyConfig } from "./overview-area-view-strategy";
import type { OverviewHomeViewStrategyConfig } from "./overview-home-view-strategy";

export interface AreasDashboardStrategyConfig {
  type: "overview";
  favorite_entities?: string[];
}

@customElement("overview-dashboard-strategy")
export class OverviewDashboardStrategy extends ReactiveElement {
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

    const areas = getAreas(hass.areas);

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => {
      const path = `areas-${area.area_id}`;

      return {
        title: area.name,
        path: path,
        subview: true,
        strategy: {
          type: "overview-area",
          area: area.area_id,
        } satisfies OverviewAreaViewStrategyConfig,
      };
    });

    const lightView = {
      title: "Lights",
      path: "lights",
      subview: true,
      strategy: {
        type: "overview-lights",
      },
      icon: AREA_STRATEGY_GROUP_ICONS.lights,
    } satisfies LovelaceViewRawConfig;

    const coversView = {
      title: "Covers",
      path: "covers",
      subview: true,
      strategy: {
        type: "overview-covers",
      },
      icon: AREA_STRATEGY_GROUP_ICONS.covers,
    } satisfies LovelaceViewRawConfig;

    return {
      views: [
        {
          icon: "mdi:home",
          path: "home",
          strategy: {
            type: "overview-home",
            favorite_entities: config.favorite_entities,
          } satisfies OverviewHomeViewStrategyConfig,
        },
        ...areaViews,
        lightView,
        coversView,
      ],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "overview-dashboard-strategy": OverviewDashboardStrategy;
  }
}
