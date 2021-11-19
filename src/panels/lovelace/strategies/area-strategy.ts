import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { subscribeOne } from "../../../common/util/subscribe-one";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import { generateAreaViewConfig } from "../common/generate-lovelace-config";
import {
  LovelaceDashboardStrategy,
  LovelaceViewStrategy,
} from "./get-strategy";

let subscribedRegistries = false;

export class AreaStrategy {
  static async generateView(
    info: Parameters<LovelaceViewStrategy["generateView"]>[0]
  ): ReturnType<LovelaceViewStrategy["generateView"]> {
    const hass = info.hass;
    const areaId = info.view.strategy?.options?.area_id;

    if (hass.config.state === STATE_NOT_RUNNING) {
      return {
        cards: [{ type: "starting" }],
      };
    }

    if (hass.config.safe_mode) {
      return {
        cards: [{ type: "safe-mode" }],
      };
    }

    let areaEntry: AreaRegistryEntry | undefined;
    let deviceEntries: DeviceRegistryEntry[] | undefined;

    // We leave this here so we always have the freshest data.
    if (!subscribedRegistries) {
      subscribedRegistries = true;
      subscribeAreaRegistry(hass.connection, (areas) => {
        areaEntry = areas.find((area) => area.area_id === areaId);
      });
      subscribeDeviceRegistry(hass.connection, (devices) => {
        deviceEntries = devices.filter((device) => device.area_id === areaId);
      });
      subscribeEntityRegistry(hass.connection, () => undefined);
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    const [localize, entityEntries] = await Promise.all([
      hass.loadBackendTranslation("title"),
      subscribeOne(hass.connection, subscribeEntityRegistry),
      subscribeOne(hass.connection, subscribeAreaRegistry),
      subscribeOne(hass.connection, subscribeDeviceRegistry),
    ]);

    if (!areaEntry) {
      return {
        cards: [{ type: "error" }],
      };
    }

    // User can override default view. If they didn't, we will add one
    // that contains all entities.
    const view = generateAreaViewConfig(
      areaEntry,
      deviceEntries || [],
      entityEntries,
      hass.states,
      localize
    );

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
    return {
      title: info.hass.config.location_name,
      views: [
        {
          strategy: { type: "area" },
        },
      ],
    };
  }
}
