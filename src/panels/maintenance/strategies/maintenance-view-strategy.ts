import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type {
  EmptyStateCardConfig,
  HeadingCardConfig,
  TileCardConfig,
} from "../../lovelace/cards/types";
import { getMaintenanceBatteryDevices } from "../maintenance-battery-data";

export interface MaintenanceViewStrategyConfig {
  type: "maintenance";
  battery_attention_threshold?: number;
}

@customElement("maintenance-view-strategy")
export class MaintenanceViewStrategy extends ReactiveElement {
  static async generate(
    config: MaintenanceViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const batteryDevices = getMaintenanceBatteryDevices(
      hass,
      config.battery_attention_threshold
    );

    if (batteryDevices.length === 0) {
      return {
        type: "panel",
        cards: [
          {
            type: "empty-state",
            icon: "mdi:battery-outline",
            icon_color: "primary",
            content_only: true,
            title: hass.localize("ui.panel.maintenance.empty_title"),
            content: hass.localize("ui.panel.maintenance.empty_content"),
          } as EmptyStateCardConfig,
        ],
      };
    }

    const section: LovelaceSectionRawConfig = {
      type: "grid",
      cards: [
        {
          type: "heading",
          heading: hass.localize("ui.panel.maintenance.devices"),
          heading_style: "title",
          icon: "mdi:battery-heart-variant",
        } satisfies HeadingCardConfig,
        ...batteryDevices.map(
          (device) =>
            ({
              type: "tile",
              entity: device.entityId,
              name: device.deviceName,
              tap_action: {
                action: "navigate",
                navigation_path: `/config/devices/device/${device.deviceId}`,
              },
              features: [
                {
                  type: "bar-gauge",
                  min: 0,
                  max: 100,
                },
              ],
            }) satisfies TileCardConfig
        ),
      ],
    };

    return {
      type: "sections",
      max_columns: 1,
      sections: [section],
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "maintenance-view-strategy": MaintenanceViewStrategy;
  }
}
