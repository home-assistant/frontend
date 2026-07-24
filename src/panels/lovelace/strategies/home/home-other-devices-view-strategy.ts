import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { clamp } from "../../../../common/number/clamp";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type {
  EmptyStateCardConfig,
  EntitiesCardConfig,
  HeadingCardConfig,
} from "../../cards/types";
import type { LovelaceStrategyDependency } from "../types";
import { getOtherDevicesEntities } from "./helpers/other-devices-filters";

export interface HomeOtherDevicesViewStrategyConfig {
  type: "home-other-devices";
  home_panel?: boolean;
}

@customElement("home-other-devices-view-strategy")
export class HomeOtherDevicesViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [
    "entities",
    "devices",
    "areas",
    "floors",
  ];

  static async generate(
    config: HomeOtherDevicesViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const sections: LovelaceSectionRawConfig[] = [];

    const devicesEntities = getOtherDevicesEntities(hass);

    for (const deviceEntities of devicesEntities) {
      const entities = deviceEntities.entities;

      const deviceId = deviceEntities.device_id;
      const device = hass.devices[deviceId];
      let heading = "";
      if (device) {
        heading =
          computeDeviceName(device) ||
          hass.localize("ui.panel.lovelace.strategy.home.unnamed_device");
      }

      sections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: heading,
            tap_action:
              device && hass.user?.is_admin
                ? {
                    action: "navigate",
                    navigation_path: `/config/devices/device/${device.id}`,
                  }
                : { action: "none" },
            badges: [
              ...(config.home_panel && device && hass.user?.is_admin
                ? [
                    {
                      type: "button",
                      icon: "mdi:home-plus",
                      text: hass.localize(
                        "ui.panel.lovelace.strategy.home-other-devices.assign_area"
                      ),
                      tap_action: {
                        action: "fire-dom-event",
                        home_panel: {
                          type: "assign_area",
                          device_id: device.id,
                        },
                      },
                    },
                  ]
                : []),
            ],
          } satisfies HeadingCardConfig,
          {
            type: "entities",
            entities: entities.map((e) => ({
              entity: e,
              name: { type: "entity" },
            })),
          } satisfies EntitiesCardConfig,
        ],
      });
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(sections.length, 2, 3);

    // No sections, show empty state
    if (sections.length === 0) {
      return {
        type: "panel",
        cards: [
          {
            type: "empty-state",
            icon: "mdi:check-all",
            content_only: true,
            title: hass.localize(
              "ui.panel.lovelace.strategy.home-other-devices.all_organized_title"
            ),
            content: hass.localize(
              "ui.panel.lovelace.strategy.home-other-devices.all_organized_content"
            ),
          } as EmptyStateCardConfig,
        ],
      };
    }

    // Take the full width if there is only one section to avoid narrow header on desktop
    if (sections.length === 1) {
      sections[0].column_span = 2;
    }

    return {
      type: "sections",
      header: {
        badges_position: "bottom",
      },
      max_columns: maxColumns,
      sections: sections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-other-devices-view-strategy": HomeOtherDevicesViewStrategy;
  }
}
