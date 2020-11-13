import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { subscribeOne } from "../../../common/util/subscribe-one";
import { subscribeAreaRegistry } from "../../../data/area_registry";
import { subscribeDeviceRegistry } from "../../../data/device_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import {
  LovelaceConfig,
  LovelaceDashboardStrategy,
  LovelaceViewConfig,
  LovelaceViewStrategy,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { generateDefaultViewConfig } from "../common/generate-lovelace-config";

let subscribedRegistries = false;

export class DefaultStrategy extends HTMLElement
  implements LovelaceDashboardStrategy, LovelaceViewStrategy {
  async generateView(info: {
    view: LovelaceViewConfig;
    lovelace: LovelaceConfig;
    hass: HomeAssistant;
  }): Promise<Partial<LovelaceViewConfig>> {
    if (!subscribedRegistries) {
      subscribedRegistries = true;
      subscribeAreaRegistry(info.hass.connection, () => undefined);
      subscribeDeviceRegistry(info.hass.connection, () => undefined);
      subscribeEntityRegistry(info.hass.connection, () => undefined);
    }

    const [areaEntries, deviceEntries, entityEntries] = await Promise.all([
      subscribeOne(info.hass.connection, subscribeAreaRegistry),
      subscribeOne(info.hass.connection, subscribeDeviceRegistry),
      subscribeOne(info.hass.connection, subscribeEntityRegistry),
    ]);

    const entities = info.hass.states;
    const config = info.hass.config;
    const localize = info.hass.localize;

    // User can override default view. If they didn't, we will add one
    // that contains all entities.
    const view = generateDefaultViewConfig(
      areaEntries,
      deviceEntries,
      entityEntries,
      entities,
      localize
    );

    // Add map of geo locations to default view if loaded
    if (config.components.includes("geo_location")) {
      if (view && view.cards) {
        view.cards.push({
          type: "map",
          geo_location_sources: ["all"],
        });
      }
    }

    // User has no entities
    if (view.cards!.length === 0) {
      view.cards!.push({
        type: "empty-state",
      });
    }

    return view;
  }

  async generateDashboard(info: {
    lovelace: LovelaceConfig;
    hass: HomeAssistant;
  }): Promise<Partial<LovelaceConfig>> {
    if (info.hass.config.state === STATE_NOT_RUNNING) {
      return {
        title: info.hass.config.location_name,
        views: [
          {
            cards: [{ type: "starting" }],
          },
        ],
      };
    }

    if (info.hass.config.safe_mode) {
      return {
        title: info.hass.config.location_name,
        views: [
          {
            cards: [{ type: "safe-mode" }],
          },
        ],
      };
    }

    return {
      views: [
        {
          strategy: { name: "default" },
          title: "default",
        },
      ],
    };
  }
}
