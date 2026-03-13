import { getAreasFloorHierarchy } from "../common/areas/areas-floor-hierarchy";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeDomain } from "../common/entity/compute_domain";
import { computeFloorName } from "../common/entity/compute_floor_name";
import type { HaDevicePickerDeviceFilterFunc } from "../components/device/ha-device-picker";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { FuseWeightedKey } from "../resources/fuseMultiTerm";
import type { HomeAssistant } from "../types";
import type { AreaRegistryEntry } from "./area/area_registry";
import {
  getDeviceEntityDisplayLookup,
  type DeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "./device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "./entity/entity";
import type { EntityRegistryDisplayEntry } from "./entity/entity_registry";
import type { FloorRegistryEntry } from "./floor_registry";

export interface FloorComboBoxItem extends PickerComboBoxItem {
  type: "floor" | "area";
  floor?: FloorRegistryEntry;
  area?: AreaRegistryEntry;
}

export interface FloorNestedComboBoxItem extends PickerComboBoxItem {
  floor?: FloorRegistryEntry;
  areas: FloorComboBoxItem[];
}

export interface UnassignedAreasFloorComboBoxItem {
  id: undefined;
  areas: FloorComboBoxItem[];
}

export interface AreaFloorValue {
  id: string;
  type: "floor" | "area";
}

export const getAreasNestedInFloors = (
  states: HomeAssistant["states"],
  haFloors: HomeAssistant["floors"],
  haAreas: HomeAssistant["areas"],
  haDevices: HomeAssistant["devices"],
  haEntities: HomeAssistant["entities"],
  formatId: (value: AreaFloorValue) => string,
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeAreas?: string[],
  excludeFloors?: string[]
) =>
  getAreasAndFloorsItems(
    states,
    haFloors,
    haAreas,
    haDevices,
    haEntities,
    formatId,
    includeDomains,
    excludeDomains,
    includeDeviceClasses,
    deviceFilter,
    entityFilter,
    excludeAreas,
    excludeFloors,
    true
  ) as (FloorNestedComboBoxItem | UnassignedAreasFloorComboBoxItem)[];

export const getAreasAndFloors = (
  states: HomeAssistant["states"],
  haFloors: HomeAssistant["floors"],
  haAreas: HomeAssistant["areas"],
  haDevices: HomeAssistant["devices"],
  haEntities: HomeAssistant["entities"],
  formatId: (value: AreaFloorValue) => string,
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeAreas?: string[],
  excludeFloors?: string[]
) =>
  getAreasAndFloorsItems(
    states,
    haFloors,
    haAreas,
    haDevices,
    haEntities,
    formatId,
    includeDomains,
    excludeDomains,
    includeDeviceClasses,
    deviceFilter,
    entityFilter,
    excludeAreas,
    excludeFloors
  ) as FloorComboBoxItem[];

export const areaFloorComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "search_labels.name",
    weight: 10,
  },
  {
    name: "search_labels.aliases",
    weight: 8,
  },
  {
    name: "search_labels.floorName",
    weight: 6,
  },
  {
    name: "search_labels.relatedAreas",
    weight: 4,
  },
  {
    name: "search_labels.id",
    weight: 3,
  },
];

const getAreasAndFloorsItems = (
  states: HomeAssistant["states"],
  haFloors: HomeAssistant["floors"],
  haAreas: HomeAssistant["areas"],
  haDevices: HomeAssistant["devices"],
  haEntities: HomeAssistant["entities"],
  formatId: (value: AreaFloorValue) => string,
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeAreas?: string[],
  excludeFloors?: string[],
  nested = false
): (
  | FloorComboBoxItem
  | FloorNestedComboBoxItem
  | UnassignedAreasFloorComboBoxItem
)[] => {
  const floors = Object.values(haFloors);
  const areas = Object.values(haAreas);
  const devices = Object.values(haDevices);
  const entities = Object.values(haEntities);

  let deviceEntityLookup: DeviceEntityDisplayLookup = {};
  let inputDevices: DeviceRegistryEntry[] | undefined;
  let inputEntities: EntityRegistryDisplayEntry[] | undefined;

  if (
    includeDomains ||
    excludeDomains ||
    includeDeviceClasses ||
    deviceFilter ||
    entityFilter
  ) {
    deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
    inputDevices = devices;
    inputEntities = entities.filter((entity) => entity.area_id);

    if (includeDomains) {
      inputDevices = inputDevices!.filter((device) => {
        const devEntities = deviceEntityLookup[device.id];
        if (!devEntities || !devEntities.length) {
          return false;
        }
        return deviceEntityLookup[device.id].some((entity) =>
          includeDomains.includes(computeDomain(entity.entity_id))
        );
      });
      inputEntities = inputEntities!.filter((entity) =>
        includeDomains.includes(computeDomain(entity.entity_id))
      );
    }

    if (excludeDomains) {
      inputDevices = inputDevices!.filter((device) => {
        const devEntities = deviceEntityLookup[device.id];
        if (!devEntities || !devEntities.length) {
          return true;
        }
        return entities.every(
          (entity) => !excludeDomains.includes(computeDomain(entity.entity_id))
        );
      });
      inputEntities = inputEntities!.filter(
        (entity) => !excludeDomains.includes(computeDomain(entity.entity_id))
      );
    }

    if (includeDeviceClasses) {
      inputDevices = inputDevices!.filter((device) => {
        const devEntities = deviceEntityLookup[device.id];
        if (!devEntities || !devEntities.length) {
          return false;
        }
        return deviceEntityLookup[device.id].some((entity) => {
          const stateObj = states[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return (
            stateObj.attributes.device_class &&
            includeDeviceClasses.includes(stateObj.attributes.device_class)
          );
        });
      });
      inputEntities = inputEntities!.filter((entity) => {
        const stateObj = states[entity.entity_id];
        return (
          stateObj.attributes.device_class &&
          includeDeviceClasses.includes(stateObj.attributes.device_class)
        );
      });
    }

    if (deviceFilter) {
      inputDevices = inputDevices!.filter((device) => deviceFilter!(device));
    }

    if (entityFilter) {
      inputDevices = inputDevices!.filter((device) => {
        const devEntities = deviceEntityLookup[device.id];
        if (!devEntities || !devEntities.length) {
          return false;
        }
        return deviceEntityLookup[device.id].some((entity) => {
          const stateObj = states[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return entityFilter(stateObj);
        });
      });
      inputEntities = inputEntities!.filter((entity) => {
        const stateObj = states[entity.entity_id];
        if (!stateObj) {
          return false;
        }
        return entityFilter!(stateObj);
      });
    }
  }

  let outputAreas = areas;
  let outputFloors = floors;

  let areaIds: string[] | undefined;

  if (inputDevices) {
    areaIds = inputDevices
      .filter((device) => device.area_id)
      .map((device) => device.area_id!);
  }

  if (inputEntities) {
    areaIds = (areaIds ?? []).concat(
      inputEntities
        .filter((entity) => entity.area_id)
        .map((entity) => entity.area_id!)
    );
  }

  if (areaIds) {
    outputAreas = outputAreas.filter((area) => areaIds!.includes(area.area_id));
  }

  if (excludeAreas) {
    outputAreas = outputAreas.filter(
      (area) => !excludeAreas!.includes(area.area_id)
    );
  }

  if (excludeFloors) {
    outputAreas = outputAreas.filter(
      (area) => !area.floor_id || !excludeFloors!.includes(area.floor_id)
    );

    outputFloors = outputFloors.filter(
      (floor) => !excludeFloors!.includes(floor.floor_id)
    );
  }

  if (
    entityFilter ||
    deviceFilter ||
    includeDomains ||
    excludeDomains ||
    includeDeviceClasses
  ) {
    // Ensure we only include floors that have areas with the filtered entities/devices
    const validFloorIds = new Set(
      outputAreas.map((area) => area.floor_id).filter((id) => id)
    );
    outputFloors = outputFloors.filter((floor) =>
      validFloorIds.has(floor.floor_id)
    );
  }

  const hierarchy = getAreasFloorHierarchy(outputFloors, outputAreas);

  const items: (
    | FloorComboBoxItem
    | FloorNestedComboBoxItem
    | UnassignedAreasFloorComboBoxItem
  )[] = [];

  hierarchy.floors.forEach((f) => {
    const floor = haFloors[f.id];
    const floorAreas = f.areas.map((areaId) => haAreas[areaId]);

    const floorName = computeFloorName(floor);

    const areaSearchLabels = floorAreas
      .map((area) => {
        const areaName = computeAreaName(area);
        return [area.area_id, ...(areaName ? [areaName] : []), ...area.aliases];
      })
      .flat();

    const floorItem: FloorComboBoxItem | FloorNestedComboBoxItem = {
      id: formatId({ id: floor.floor_id, type: "floor" }),
      type: "floor",
      primary: floorName,
      floor: floor,
      icon: floor.icon || undefined,
      search_labels: {
        id: floor.floor_id,
        name: floorName || null,
        aliases: floor.aliases.join(", ") || null,
        relatedAreas: areaSearchLabels.join(" ") || null,
      },
    };

    items.push(floorItem);

    const floorAreasItems = floorAreas.map((area) => {
      const areaName = computeAreaName(area);
      return {
        id: formatId({ id: area.area_id, type: "area" }),
        type: "area" as const,
        primary: areaName || area.area_id,
        area: area,
        icon: area.icon || undefined,
        search_labels: {
          id: area.area_id,
          name: areaName || null,
          aliases: area.aliases.join(", ") || null,
          floorName: floorName || null,
        },
      };
    });

    if (nested && floor) {
      (floorItem as unknown as FloorNestedComboBoxItem).areas = floorAreasItems;
    } else {
      items.push(...floorAreasItems);
    }
  });

  const unassignedAreaItems = hierarchy.areas.map((areaId) => {
    const area = haAreas[areaId];
    const areaName = computeAreaName(area);
    return {
      id: formatId({ id: area.area_id, type: "area" }),
      type: "area" as const,
      primary: areaName || area.area_id,
      area: area,
      icon: area.icon || undefined,
      search_labels: {
        id: area.area_id,
        name: areaName || null,
        aliases: area.aliases.join(", ") || null,
      },
    };
  });

  if (nested && unassignedAreaItems.length) {
    items.push({
      id: undefined,
      areas: unassignedAreaItems,
    } as UnassignedAreasFloorComboBoxItem);
  } else {
    items.push(...unassignedAreaItems);
  }

  return items;
};
