import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { getAreas } from "../areas/helpers/areas-strategy-helper";
import type { LovelaceStrategyEditor } from "../types";
import {
  getSummaryLabel,
  HOME_SUMMARIES_ICONS,
} from "./helpers/home-summaries";
import type { HomeAreaViewStrategyConfig } from "./home-area-view-strategy";
import type { HomeMainViewStrategyConfig } from "./home-main-view-strategy";

export interface HomeDashboardStrategyConfig {
  type: "home";
  favorite_entities?: string[];
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

    const areas = getAreas(hass.areas);

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

    const lightView = {
      title: getSummaryLabel(hass, "lights"),
      path: "lights",
      subview: true,
      strategy: {
        type: "home-lights",
      },
      icon: HOME_SUMMARIES_ICONS.lights,
    } satisfies LovelaceViewRawConfig;

    const climateView = {
      title: getSummaryLabel(hass, "climate"),
      path: "climate",
      subview: true,
      strategy: {
        type: "home-climate",
      },
      icon: HOME_SUMMARIES_ICONS.climate,
    } satisfies LovelaceViewRawConfig;

    const securityView = {
      title: getSummaryLabel(hass, "security"),
      path: "security",
      subview: true,
      strategy: {
        type: "home-security",
      },
      icon: HOME_SUMMARIES_ICONS.security,
    } satisfies LovelaceViewRawConfig;

    const mediaPlayersView = {
      title: getSummaryLabel(hass, "media_players"),
      path: "media-players",
      subview: true,
      strategy: {
        type: "home-media-players",
      },
      icon: HOME_SUMMARIES_ICONS.media_players,
    } satisfies LovelaceViewRawConfig;

    return {
      views: [
        {
          icon: "mdi:home",
          path: "home",
          strategy: {
            type: "home-main",
            favorite_entities: config.favorite_entities,
          } satisfies HomeMainViewStrategyConfig,
        },
        ...areaViews,
        lightView,
        climateView,
        securityView,
        mediaPlayersView,
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
