import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { subscribeOne } from "../../../common/util/subscribe-one";
import { subscribeAreaRegistry } from "../../../data/area_registry";
import { subscribeDeviceRegistry } from "../../../data/device_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import {
  LovelaceConfig,
  LovelaceDashboardStrategy,
  LovelaceViewStrategy,
} from "../../../data/lovelace";
import { generateDefaultViewConfig } from "../common/generate-lovelace-config";

let subscribedRegistries = false;

export class DefaultStrategy extends HTMLElement {
  static async generateView(
    info: Parameters<LovelaceViewStrategy["generateView"]>[0]
  ): ReturnType<LovelaceViewStrategy["generateView"]> {
    const hass = info.hass;

    if (!subscribedRegistries) {
      subscribedRegistries = true;
      subscribeAreaRegistry(hass.connection, () => undefined);
      subscribeDeviceRegistry(hass.connection, () => undefined);
      subscribeEntityRegistry(hass.connection, () => undefined);
    }

    const [areaEntries, deviceEntries, entityEntries] = await Promise.all([
      subscribeOne(hass.connection, subscribeAreaRegistry),
      subscribeOne(hass.connection, subscribeDeviceRegistry),
      subscribeOne(hass.connection, subscribeEntityRegistry),
    ]);

    const entities = hass.states;
    const config = hass.config;
    const localize = hass.localize;

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

  static async generateDashboard(
    info: Parameters<LovelaceDashboardStrategy["generateDashboard"]>[0]
  ): ReturnType<LovelaceDashboardStrategy["generateDashboard"]> {
    const hass = info.hass;

    if (hass.config.state === STATE_NOT_RUNNING) {
      return {
        title: hass.config.location_name,
        views: [
          {
            cards: [{ type: "starting" }],
          },
        ],
      };
    }

    if (hass.config.safe_mode) {
      return {
        title: hass.config.location_name,
        views: [
          {
            cards: [{ type: "safe-mode" }],
          },
        ],
      };
    }

    const config: LovelaceConfig = {
      views: [],
    };

    config.views.push(
      await this.generateView({
        view: {},
        lovelace: config,
        hass,
      })
    );

    return config;

    // Once we implement view strategies, we can return this:
    // return {
    //   views: [
    //     {
    //       strategy: { name: "default" },
    //       title: "default",
    //     },
    //   ],
    // };
  }
}
