import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { isHelperDomain } from "../../../config/helpers/const";
import type {
  EmptyStateCardConfig,
  HeadingCardConfig,
} from "../../cards/types";
import { OTHER_DEVICES_FILTERS } from "./helpers/other-devices-filters";

export interface HomeOtherDevicesViewStrategyConfig {
  type: "home-other-devices";
  home_panel?: boolean;
}

@customElement("home-other-devices-view-strategy")
export class HomeOtherDevicesViewStrategy extends ReactiveElement {
  static async generate(
    config: HomeOtherDevicesViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const allEntities = Object.keys(hass.states);

    const otherDevicesFilters = OTHER_DEVICES_FILTERS.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const otherDevicesEntities = findEntities(allEntities, otherDevicesFilters);

    const sections: LovelaceSectionRawConfig[] = [];

    const entitiesByDevice: Record<string, string[]> = {};
    const entitiesWithoutDevices: string[] = [];
    for (const entityId of otherDevicesEntities) {
      const stateObj = hass.states[entityId];
      if (!stateObj) continue;
      const { device } = getEntityContext(
        stateObj,
        hass.entities,
        hass.devices,
        hass.areas,
        hass.floors
      );
      if (!device) {
        entitiesWithoutDevices.push(entityId);
        continue;
      }
      if (!(device.id in entitiesByDevice)) {
        entitiesByDevice[device.id] = [];
      }
      entitiesByDevice[device.id].push(entityId);
    }

    const devicesEntities = Object.entries(entitiesByDevice).map(
      ([deviceId, entities]) => ({
        device_id: deviceId,
        entities: entities,
      })
    );

    const helpersEntities = entitiesWithoutDevices.filter((entityId) => {
      const domain = computeDomain(entityId);
      return isHelperDomain(domain);
    });

    const otherEntities = entitiesWithoutDevices.filter((entityId) => {
      const domain = computeDomain(entityId);
      return !isHelperDomain(domain);
    });

    const batteryFilter = generateEntityFilter(hass, {
      domain: "sensor",
      device_class: "battery",
    });

    const energyFilter = generateEntityFilter(hass, {
      domain: "sensor",
      device_class: ["energy", "power"],
    });

    const primaryFilter = generateEntityFilter(hass, {
      entity_category: "none",
    });

    for (const deviceEntities of devicesEntities) {
      if (deviceEntities.entities.length === 0) continue;

      const batteryEntities = deviceEntities.entities.filter((e) =>
        batteryFilter(e)
      );
      const entities = deviceEntities.entities.filter(
        (e) => !batteryFilter(e) && !energyFilter(e) && primaryFilter(e)
      );

      if (entities.length === 0) {
        continue;
      }

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
              ...batteryEntities.slice(0, 1).map((e) => ({
                entity: e,
                type: "entity",
                tap_action: {
                  action: "more-info",
                },
              })),
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
          ...entities.map((e) => ({
            type: "tile",
            entity: e,
            name: {
              type: "entity",
            },
          })),
        ],
      });
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(sections.length, 2, 3);

    if (helpersEntities.length) {
      sections.push({
        type: "grid",
        column_span: maxColumns,
        cards: [
          {
            type: "heading",
            heading: hass.localize(
              "ui.panel.lovelace.strategy.home-other-devices.helpers"
            ),
          } satisfies HeadingCardConfig,
          ...helpersEntities.map((e) => ({
            type: "tile",
            entity: e,
          })),
        ],
      });
    }

    if (otherEntities.length) {
      sections.push({
        type: "grid",
        column_span: maxColumns,
        cards: [
          {
            type: "heading",
            heading: hass.localize(
              "ui.panel.lovelace.strategy.home-other-devices.entities"
            ),
          } satisfies HeadingCardConfig,
          ...otherEntities.map((e) => ({
            type: "tile",
            entity: e,
          })),
        ],
      });
    }

    // No sections, show empty state
    if (sections.length === 0) {
      return {
        type: "panel",
        cards: [
          {
            type: "empty-state",
            icon: "mdi:check-all",
            icon_color: "primary",
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
