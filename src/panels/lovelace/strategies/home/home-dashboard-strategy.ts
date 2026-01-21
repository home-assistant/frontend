import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceStrategyEditor } from "../types";
import {
  getSummaryLabel,
  HOME_SUMMARIES_ICONS,
} from "./helpers/home-summaries";
import type { HomeAreaViewStrategyConfig } from "./home-area-view-strategy";
import type { HomeOtherDevicesViewStrategyConfig } from "./home-other-devices-view-strategy";
import type { HomeOverviewViewStrategyConfig } from "./home-overview-view-strategy";

export interface HomeDashboardStrategyConfig {
  type: "home";
  favorite_entities?: string[];
  home_panel?: boolean;
}

@customElement("home-dashboard-strategy")
export class HomeDashboardStrategy extends ReactiveElement {
  static async generate(
    config: HomeDashboardStrategyConfig,
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

    const areas = Object.values(hass.areas);

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => {
      const path = `areas-${area.area_id}`;

      return {
        title: area.name,
        path: path,
        subview: true,
        strategy: {
          type: "home-area",
          area: area.area_id,
        } satisfies HomeAreaViewStrategyConfig,
      };
    });

    const mediaPlayersView = {
      title: getSummaryLabel(hass.localize, "media_players"),
      path: "media-players",
      subview: true,
      strategy: {
        type: "home-media-players",
      },
      icon: HOME_SUMMARIES_ICONS.media_players,
    } satisfies LovelaceViewRawConfig;

    const otherDevicesView = {
      title: hass.localize("ui.panel.lovelace.strategy.home.devices"),
      path: "other-devices",
      subview: true,
      strategy: {
        type: "home-other-devices",
        home_panel: config.home_panel,
      } satisfies HomeOtherDevicesViewStrategyConfig,
      icon: "mdi:devices",
    } satisfies LovelaceViewRawConfig;

    return {
      views: [
        {
          icon: "mdi:home",
          path: "overview",
          strategy: {
            type: "home-overview",
            favorite_entities: config.favorite_entities,
          } satisfies HomeOverviewViewStrategyConfig,
        },
        ...areaViews,
        mediaPlayersView,
        otherDevicesView,
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import("./editor/hui-home-dashboard-strategy-editor");
    return document.createElement("hui-home-dashboard-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-dashboard-strategy": HomeDashboardStrategy;
  }
}
