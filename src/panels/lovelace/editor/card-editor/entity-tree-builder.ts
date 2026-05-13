import {
  mdiHomeAssistant,
  mdiPuzzle,
  mdiShape,
  mdiToggleSwitch,
} from "@mdi/js";
import type { FuseIndex } from "fuse.js";
import Fuse from "fuse.js";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { stringCompare } from "../../../../common/string/compare";
import { isUnavailableState } from "../../../../data/entity/entity";
import { getFloorAreaLookup } from "../../../../data/floor_registry";
import { domainToName } from "../../../../data/integration";
import type { FuseWeightedKey } from "../../../../resources/fuseMultiTerm";
import { multiTermSortedSearch } from "../../../../resources/fuseMultiTerm";
import type { HomeAssistant } from "../../../../types";
import { isHelperDomain } from "../../../config/helpers/const";

export interface DeviceNode {
  id: string;
  name: string;
  entityIds: string[];
}

export interface AreaNode {
  id: string;
  name: string;
  icon?: string;
  directEntityIds: string[];
  devices: DeviceNode[];
}

export interface FloorNode {
  id: string;
  name: string;
  icon: string | null;
  level: number | null;
  areas: AreaNode[];
}

export interface DomainGroup {
  domain: string;
  name: string;
  entityIds: string[];
}

export interface SearchableEntity {
  id: string;
  name: string;
  area: string;
  device: string;
  floor: string;
  domain: string;
}

export interface UnassignedSection {
  id: "entities" | "helpers" | "devices" | "services";
  label: string;
  iconPath: string;
  domains?: DomainGroup[];
  devices?: DeviceNode[];
}

export interface EntityTree {
  floors: FloorNode[];
  otherAreas: AreaNode[];
  unassignedSections: UnassignedSection[];
  searchableEntities: SearchableEntity[];
  fuseIndex: FuseIndex<SearchableEntity>;
}

export const OTHER_AREAS_ID = "__other_areas__";
const SEP = "~";

export const floorKey = (id: string) => `f|${id}`;
export const unassignedKey = (id: string) => `u|${id}`;
export const areaKey = (parent: string, id: string) => `${parent}${SEP}a|${id}`;
export const deviceKey = (parent: string, id: string) =>
  `${parent}${SEP}d|${id}`;
export const domainKey = (parent: string, domain: string) =>
  `${parent}${SEP}dom|${domain}`;
export const childKeyPrefix = (key: string) => `${key}${SEP}`;

export const SEARCH_KEYS: FuseWeightedKey[] = [
  { name: "name", weight: 4 },
  { name: "id", weight: 2 },
  { name: "area", weight: 2 },
  { name: "device", weight: 2 },
  { name: "floor", weight: 1 },
  { name: "domain", weight: 1 },
];

const FUSE_KEY_NAMES = SEARCH_KEYS.map((k) => k.name as string);

export function buildEntityTree(hass: HomeAssistant): EntityTree {
  const {
    states,
    entities: entityReg,
    devices: deviceReg,
    areas: areaReg,
    floors: floorReg,
  } = hass;
  const language = hass.locale?.language;

  const areaDirectEntities = new Map<string, string[]>();
  const areaDeviceEntities = new Map<string, Map<string, string[]>>();
  const unassignedDeviceEntities = new Map<string, string[]>();
  const unassignedServiceEntities = new Map<string, string[]>();
  const unassignedHelperByDomain = new Map<string, string[]>();
  const unassignedEntityByDomain = new Map<string, string[]>();
  const searchableEntities: SearchableEntity[] = [];

  for (const entityId of Object.keys(states)) {
    const stateObj = states[entityId];
    if (!stateObj || isUnavailableState(stateObj.state)) continue;

    const entry = entityReg[entityId];
    if (entry?.hidden) continue;

    const device = entry?.device_id ? deviceReg[entry.device_id] : undefined;
    const areaId = entry?.area_id ?? device?.area_id;
    const area = areaId ? areaReg[areaId] : undefined;
    const floor = area?.floor_id ? floorReg[area.floor_id] : undefined;
    const domain = computeDomain(entityId);

    searchableEntities.push({
      id: entityId,
      name: computeStateName(stateObj) || entityId,
      area: area ? (computeAreaName(area) ?? "") : "",
      device: device ? (computeDeviceName(device) ?? "") : "",
      floor: floor?.name ?? "",
      domain: domainToName(hass.localize, domain),
    });

    if (!areaId || !areaReg[areaId]) {
      if (device) {
        const isService = device.entry_type === "service";
        const target = isService
          ? unassignedServiceEntities
          : unassignedDeviceEntities;
        const list = target.get(device.id) ?? [];
        list.push(entityId);
        target.set(device.id, list);
      } else if (isHelperDomain(domain)) {
        const list = unassignedHelperByDomain.get(domain) ?? [];
        list.push(entityId);
        unassignedHelperByDomain.set(domain, list);
      } else {
        const list = unassignedEntityByDomain.get(domain) ?? [];
        list.push(entityId);
        unassignedEntityByDomain.set(domain, list);
      }
      continue;
    }

    const groupUnderDevice = device && !entry?.area_id;
    if (groupUnderDevice) {
      const byDevice = areaDeviceEntities.get(areaId) ?? new Map();
      const list = byDevice.get(device!.id) ?? [];
      list.push(entityId);
      byDevice.set(device!.id, list);
      areaDeviceEntities.set(areaId, byDevice);
    } else {
      const list = areaDirectEntities.get(areaId) ?? [];
      list.push(entityId);
      areaDirectEntities.set(areaId, list);
    }
  }

  const sortByName = (a: string, b: string) => {
    const an = computeStateName(states[a]) || a;
    const bn = computeStateName(states[b]) || b;
    return stringCompare(an, bn, language);
  };

  const buildAreaNode = (areaId: string): AreaNode | undefined => {
    const area = areaReg[areaId];
    if (!area) return undefined;
    const directIds = (areaDirectEntities.get(areaId) ?? []).sort(sortByName);
    const byDevice = areaDeviceEntities.get(areaId);
    const devices: DeviceNode[] = byDevice
      ? [...byDevice.entries()]
          .map(([id, ids]) => {
            const device = deviceReg[id];
            return {
              id,
              name: (device ? computeDeviceName(device) : undefined) ?? id,
              entityIds: ids.sort(sortByName),
            };
          })
          .sort((a, b) => stringCompare(a.name, b.name, language))
      : [];
    if (!directIds.length && !devices.length) return undefined;
    return {
      id: area.area_id,
      name: computeAreaName(area) ?? area.area_id,
      icon: area.icon ?? undefined,
      directEntityIds: directIds,
      devices,
    };
  };

  const areas = Object.values(areaReg);
  const floors = Object.values(floorReg);
  const floorAreaLookup = getFloorAreaLookup(areas);

  const floorNodes: FloorNode[] = floors
    .map((floor) => {
      const areaList = (floorAreaLookup[floor.floor_id] ?? [])
        .map((a) => buildAreaNode(a.area_id))
        .filter((a): a is AreaNode => !!a)
        .sort((a, b) => stringCompare(a.name, b.name, language));
      if (!areaList.length) return undefined;
      return {
        id: floor.floor_id,
        name: floor.name,
        icon: floor.icon,
        level: floor.level,
        areas: areaList,
      };
    })
    .filter((f): f is FloorNode => !!f)
    .sort((a, b) => stringCompare(a.name, b.name, language));

  const otherAreas = areas
    .filter((a) => !a.floor_id || !floorReg[a.floor_id])
    .map((a) => buildAreaNode(a.area_id))
    .filter((a): a is AreaNode => !!a)
    .sort((a, b) => stringCompare(a.name, b.name, language));

  const buildDeviceNodes = (source: Map<string, string[]>): DeviceNode[] =>
    [...source.entries()]
      .map(([id, ids]) => {
        const device = deviceReg[id];
        return {
          id,
          name: (device ? computeDeviceName(device) : undefined) ?? id,
          entityIds: ids.sort(sortByName),
        };
      })
      .sort((a, b) => stringCompare(a.name, b.name, language));

  const buildDomainGroups = (source: Map<string, string[]>): DomainGroup[] =>
    [...source.entries()]
      .map(([domain, ids]) => ({
        domain,
        name: domainToName(hass.localize, domain),
        entityIds: ids.sort(sortByName),
      }))
      .sort((a, b) => stringCompare(a.name, b.name, language));

  const unassignedSections: UnassignedSection[] = [];
  const entityDomains = buildDomainGroups(unassignedEntityByDomain);
  if (entityDomains.length) {
    unassignedSections.push({
      id: "entities",
      iconPath: mdiShape,
      label: hass.localize("ui.panel.lovelace.editor.cardpicker.entities"),
      domains: entityDomains,
    });
  }
  const helperDomains = buildDomainGroups(unassignedHelperByDomain);
  if (helperDomains.length) {
    unassignedSections.push({
      id: "helpers",
      iconPath: mdiToggleSwitch,
      label: hass.localize("ui.panel.lovelace.editor.cardpicker.helpers"),
      domains: helperDomains,
    });
  }
  const orphanDevices = buildDeviceNodes(unassignedDeviceEntities);
  if (orphanDevices.length) {
    unassignedSections.push({
      id: "devices",
      iconPath: mdiPuzzle,
      label: hass.localize("ui.panel.lovelace.editor.cardpicker.devices"),
      devices: orphanDevices,
    });
  }
  const orphanServices = buildDeviceNodes(unassignedServiceEntities);
  if (orphanServices.length) {
    unassignedSections.push({
      id: "services",
      iconPath: mdiHomeAssistant,
      label: hass.localize("ui.panel.lovelace.editor.cardpicker.services"),
      devices: orphanServices,
    });
  }

  return {
    floors: floorNodes,
    otherAreas,
    unassignedSections,
    searchableEntities,
    fuseIndex: Fuse.createIndex(FUSE_KEY_NAMES, searchableEntities),
  };
}

// Returns the list of branch keys (floor, area, device, …) that must be
// expanded so the entity is visible in the tree. Empty when the entity isn't
// reachable from the snapshot.
export function pathToEntity(tree: EntityTree, entityId: string): string[] {
  for (const floor of tree.floors) {
    const fKey = floorKey(floor.id);
    for (const area of floor.areas) {
      const aKey = areaKey(fKey, area.id);
      if (area.directEntityIds.includes(entityId)) return [fKey, aKey];
      for (const device of area.devices) {
        if (device.entityIds.includes(entityId)) {
          return [fKey, aKey, deviceKey(aKey, device.id)];
        }
      }
    }
  }

  const otherAreasFloor = floorKey(OTHER_AREAS_ID);
  for (const area of tree.otherAreas) {
    const aKey = areaKey(otherAreasFloor, area.id);
    if (area.directEntityIds.includes(entityId)) {
      return [otherAreasFloor, aKey];
    }
    for (const device of area.devices) {
      if (device.entityIds.includes(entityId)) {
        return [otherAreasFloor, aKey, deviceKey(aKey, device.id)];
      }
    }
  }

  for (const section of tree.unassignedSections) {
    const sKey = unassignedKey(section.id);
    if (section.devices) {
      for (const device of section.devices) {
        if (device.entityIds.includes(entityId)) {
          return [sKey, deviceKey(sKey, device.id)];
        }
      }
    }
    if (section.domains) {
      for (const group of section.domains) {
        if (group.entityIds.includes(entityId)) {
          return [sKey, domainKey(sKey, group.domain)];
        }
      }
    }
  }

  return [];
}

export function searchEntities(
  tree: EntityTree,
  filter: string,
  limit = 100
): SearchableEntity[] {
  if (!filter) return [];
  return multiTermSortedSearch(
    tree.searchableEntities,
    filter,
    SEARCH_KEYS,
    (item) => item.id,
    tree.fuseIndex
  ).slice(0, limit);
}
