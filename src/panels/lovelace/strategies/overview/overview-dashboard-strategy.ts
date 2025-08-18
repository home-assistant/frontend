import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { getAreas } from "../areas/helpers/areas-strategy-helper";
import type { LovelaceStrategyEditor } from "../types";
import { OVERVIEW_SUMMARIES_ICONS } from "./helpers/overview-summaries";
import type { OverviewAreaViewStrategyConfig } from "./overview-area-view-strategy";
import type { OverviewHomeViewStrategyConfig } from "./overview-home-view-strategy";

export interface OverviewDashboardStrategyConfig {
  type: "overview";
  favorite_entities?: string[];
}

@customElement("overview-dashboard-strategy")
export class OverviewDashboardStrategy extends ReactiveElement {
  static async generate(
    config: OverviewDashboardStrategyConfig,
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
      icon: OVERVIEW_SUMMARIES_ICONS.lights,
    } satisfies LovelaceViewRawConfig;

    const climateView = {
      title: "Climate",
      path: "climate",
      subview: true,
      strategy: {
        type: "overview-climate",
      },
      icon: OVERVIEW_SUMMARIES_ICONS.climate,
    } satisfies LovelaceViewRawConfig;

    const securityView = {
      title: "Security",
      path: "security",
      subview: true,
      strategy: {
        type: "overview-security",
      },
      icon: OVERVIEW_SUMMARIES_ICONS.security,
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
        climateView,
        securityView,
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import("./editor/hui-overview-dashboard-strategy-editor");
    return document.createElement("hui-overview-dashboard-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "overview-dashboard-strategy": OverviewDashboardStrategy;
  }
}
