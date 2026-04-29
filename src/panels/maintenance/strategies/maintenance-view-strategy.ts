import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getAreasFloorHierarchy } from "../../../common/areas/areas-floor-hierarchy";
import {
  findEntities,
  generateEntityFilter,
  type EntityFilter,
} from "../../../common/entity/entity_filter";
import { floorDefaultIcon } from "../../../components/ha-floor-icon";
import {
  getConfigEntries,
  type ConfigEntry,
} from "../../../data/config_entries";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { TileCardConfig } from "../../lovelace/cards/types";

export interface MaintenanceViewStrategyConfig {
  type: "maintenance";
}

export const maintenanceEntityFilters: EntityFilter[] = [
  {
    domain: "sensor",
    device_class: ["battery"],
  },
  {
    domain: "binary_sensor",
    device_class: ["battery", "battery_charging"],
    entity_category: "none",
  },
];

const LOW_BATTERY_THRESHOLD = 20;

export const filterNeedsAttentionEntities = (
  hass: HomeAssistant,
  entityIds: string[]
): string[] =>
  entityIds.filter((entityId) => {
    const stateValue = parseFloat(hass.states[entityId]?.state ?? "");
    return !isNaN(stateValue) && stateValue <= LOW_BATTERY_THRESHOLD;
  });

/**
 * For devices with battery entities from multiple integrations, keep only
 * entities from the primary integration. The primary integration is
 * determined by matching the device's primary config entry to its domain.
 * Entities without a device pass through.
 */
export const collapseBatteryEntities = (
  hass: HomeAssistant,
  entityIds: string[],
  configEntryLookup?: Record<string, ConfigEntry>
): string[] => {
  if (!configEntryLookup) {
    return entityIds;
  }

  // Group entities by device. Entities without a device pass through.
  const byDevice: Record<string, string[]> = {};
  const entitiesWithoutDevice: string[] = [];

  for (const eid of entityIds) {
    const deviceId = hass.entities[eid]?.device_id;
    if (!deviceId) {
      entitiesWithoutDevice.push(eid);
    } else {
      if (!byDevice[deviceId]) {
        byDevice[deviceId] = [];
      }
      byDevice[deviceId].push(eid);
    }
  }

  // When a device has entities from multiple integrations
  // (e.g. Battery Notes), keep only the primary integration's entities.
  const collapsedEntities = Object.entries(byDevice).flatMap(
    ([deviceId, entities]) => {
      const primaryConfigEntryId =
        hass.devices?.[deviceId]?.primary_config_entry;
      const primaryDomain = primaryConfigEntryId
        ? configEntryLookup[primaryConfigEntryId]?.domain
        : undefined;

      if (primaryDomain) {
        return entities.filter(
          (eid) => hass.entities[eid]?.platform === primaryDomain
        );
      }

      return entities;
    }
  );

  return [...entitiesWithoutDevice, ...collapsedEntities];
};

const computeBatteryTileCard = (entityId: string): TileCardConfig => ({
  type: "tile",
  entity: entityId,
  name: { type: "device" },
});

const processAreasForBattery = (
  areaIds: string[],
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const cards: LovelaceCardConfig[] = [];

  for (const areaId of areaIds) {
    const area = hass.areas[areaId];
    if (!area) continue;

    const areaFilter = generateEntityFilter(hass, {
      area: area.area_id,
    });
    const areaBatteryEntities = entities.filter(areaFilter);
    const areaCards: LovelaceCardConfig[] = [];

    for (const entityId of areaBatteryEntities) {
      areaCards.push(computeBatteryTileCard(entityId));
    }

    if (areaCards.length > 0) {
      cards.push({
        heading_style: "subtitle",
        type: "heading",
        heading: area.name,
        tap_action: hass.panels.home
          ? {
              action: "navigate",
              navigation_path: `/home/areas-${area.area_id}`,
            }
          : undefined,
      });
      cards.push(...areaCards);
    }
  }

  return cards;
};

const processUnassignedEntities = (
  hass: HomeAssistant,
  entities: string[]
): LovelaceCardConfig[] => {
  const unassignedFilter = generateEntityFilter(hass, {
    area: null,
  });
  const unassignedEntities = entities.filter(unassignedFilter);
  const cards: LovelaceCardConfig[] = [];

  for (const entityId of unassignedEntities) {
    cards.push(computeBatteryTileCard(entityId));
  }

  return cards;
};

@customElement("maintenance-view-strategy")
export class MaintenanceViewStrategy extends ReactiveElement {
  static async generate(
    _config: MaintenanceViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const areas = Object.values(hass.areas);
    const floors = Object.values(hass.floors);
    const hierarchy = getAreasFloorHierarchy(floors, areas);

    const sections: LovelaceSectionRawConfig[] = [];

    const allEntities = Object.keys(hass.states);

    const batteryFilters = maintenanceEntityFilters.map((filter) =>
      generateEntityFilter(hass, filter)
    );

    const configEntries = await getConfigEntries(hass);
    const configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );

    const entities = collapseBatteryEntities(
      hass,
      findEntities(allEntities, batteryFilters),
      configEntryLookup
    );

    const floorCount =
      hierarchy.floors.length + (hierarchy.areas.length ? 1 : 0);

    // Process floors
    for (const floorStructure of hierarchy.floors) {
      const floorId = floorStructure.id;
      const areaIds = floorStructure.areas;
      const floor = hass.floors[floorId];

      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              floorCount > 1
                ? floor.name
                : hass.localize("ui.panel.lovelace.strategy.home.areas"),
            icon: floor.icon || floorDefaultIcon(floor),
          },
        ],
      };

      const areaCards = processAreasForBattery(areaIds, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned areas
    if (hierarchy.areas.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              floorCount > 1
                ? hass.localize(
                    "ui.panel.lovelace.strategy.maintenance.other_devices"
                  )
                : hass.localize("ui.panel.lovelace.strategy.home.areas"),
          },
        ],
      };

      const areaCards = processAreasForBattery(hierarchy.areas, hass, entities);

      if (areaCards.length > 0) {
        section.cards!.push(...areaCards);
        sections.push(section);
      }
    }

    // Process unassigned entities
    const unassignedCards = processUnassignedEntities(hass, entities);

    if (unassignedCards.length > 0) {
      const section: LovelaceSectionRawConfig = {
        type: "grid",
        column_span: 2,
        cards: [
          {
            type: "heading",
            heading:
              sections.length > 0
                ? hass.localize(
                    "ui.panel.lovelace.strategy.maintenance.other_devices"
                  )
                : hass.localize(
                    "ui.panel.lovelace.strategy.maintenance.devices"
                  ),
          },
          ...unassignedCards,
        ],
      };
      sections.push(section);
    }

    return {
      type: "sections",
      max_columns: 2,
      sections: sections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "maintenance-view-strategy": MaintenanceViewStrategy;
  }
}
