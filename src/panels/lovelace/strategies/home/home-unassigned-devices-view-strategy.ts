import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../common/entity/entity_filter";
import { clamp } from "../../../../common/number/clamp";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { HeadingCardConfig } from "../../cards/types";
import { HOME_SUMMARIES_FILTERS } from "./helpers/home-summaries";

export interface HomeUnassignedDevicesViewStrategyConfig {
  type: "home-unassigned-devices";
}

@customElement("home-unassigned-devices-view-strategy")
export class HomeUnassignedDevicesViewStrategy extends ReactiveElement {
  static async generate(
    _config: HomeUnassignedDevicesViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const sections: LovelaceSectionRawConfig[] = [];
    const allEntities = Object.keys(hass.states);

    const unassignedFilters = HOME_SUMMARIES_FILTERS.unassigned_devices.map(
      (filter) => generateEntityFilter(hass, filter)
    );

    const unassignedEntities = findEntities(allEntities, unassignedFilters);

    const deviceSections: LovelaceSectionRawConfig[] = [];

    const entitiesByDevice: Record<string, string[]> = {};
    const entitiesWithoutDevices: string[] = [];
    for (const entityId of unassignedEntities) {
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

    const otherDeviceEntities = Object.entries(entitiesByDevice).map(
      ([deviceId, entities]) => ({
        device_id: deviceId,
        entities: entities,
      })
    );

    if (entitiesWithoutDevices.length > 0) {
      otherDeviceEntities.push({
        device_id: "unassigned",
        entities: entitiesWithoutDevices,
      });
    }

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

    for (const deviceEntities of otherDeviceEntities) {
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
          hass.localize("ui.panel.lovelace.strategy.home.unamed_device");
      } else {
        heading = hass.localize("ui.panel.lovelace.strategy.home.others");
      }

      deviceSections.push({
        type: "grid",
        cards: [
          {
            type: "heading",
            heading: heading,
            tap_action: device
              ? {
                  action: "navigate",
                  navigation_path: `/config/devices/device/${device.id}`,
                }
              : undefined,
            badges: [
              ...batteryEntities.slice(0, 1).map((e) => ({
                entity: e,
                type: "entity",
                tap_action: {
                  action: "more-info",
                },
              })),
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

    if (deviceSections.length > 0) {
      sections.push({
        type: "grid",
        column_span: 3,
        cards: [
          {
            type: "heading",
            heading_style: "subtitle",
            heading: "",
          } satisfies HeadingCardConfig,
        ],
      } satisfies LovelaceSectionRawConfig);
      sections.push(...deviceSections);
    }

    // Allow between 2 and 3 columns (the max should be set to define the width of the header)
    const maxColumns = clamp(sections.length, 2, 3);

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
    "home-unassigned-devices-view-strategy": HomeUnassignedDevicesViewStrategy;
  }
}
