import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { subscribeOne } from "../../../common/util/subscribe-one";
import { subscribeAreaRegistry } from "../../../data/area_registry";
import { subscribeDeviceRegistry } from "../../../data/device_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import { LovelaceViewConfig } from "../../../data/lovelace";
import {
  LovelaceDashboardStrategy,
  LovelaceViewStrategy,
} from "./get-strategy";

let subscribedRegistries = false;

export class AreaOverviewStrategy {
  static async generateView(
    info: Parameters<LovelaceViewStrategy["generateView"]>[0]
  ): ReturnType<LovelaceViewStrategy["generateView"]> {
    const hass = info.hass;
    const view: LovelaceViewConfig = { cards: [] };

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

    // We leave this here so we always have the freshest data.
    if (!subscribedRegistries) {
      subscribedRegistries = true;
      subscribeAreaRegistry(hass.connection, () => undefined);
      subscribeDeviceRegistry(hass.connection, () => undefined);
      subscribeEntityRegistry(hass.connection, () => undefined);
    }

    const [areaEntries] = await Promise.all([
      subscribeOne(hass.connection, subscribeAreaRegistry),
    ]);

    areaEntries.forEach((area) => {
      view.cards?.push({
        type: "area",
        area: area.area_id,
        image:
          "https://www.boardandvellum.com/wp-content/uploads/2019/09/16x9-private_offices_vs_open_office_concepts-1242x699.jpg",
      });
    });

    return view;
  }

  static async generateDashboard(
    info: Parameters<LovelaceDashboardStrategy["generateDashboard"]>[0]
  ): ReturnType<LovelaceDashboardStrategy["generateDashboard"]> {
    const [areaEntries] = await Promise.all([
      subscribeOne(info.hass.connection, subscribeAreaRegistry),
    ]);

    const areaViews = areaEntries.map((area) => ({
      strategy: {
        type: "original-states",
        options: { areaId: area.area_id },
      },
      title: area.name,
    }));
    return {
      title: info.hass.config.location_name,
      views: [
        {
          strategy: { type: "area-overview" },
          title: "Overview",
        },
        ...areaViews,
      ],
    };
  }
}
