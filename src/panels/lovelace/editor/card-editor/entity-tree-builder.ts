import {
  mdiHomeAssistant,
  mdiPuzzle,
  mdiShape,
  mdiToggleSwitch,
} from "@mdi/js";
import type { FuseIndex } from "fuse.js";
import Fuse from "fuse.js";
import { getAreasFloorHierarchy } from "../../../../common/areas/areas-floor-hierarchy";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { getDeviceAreaId } from "../../../../common/entity/context/get_device_context";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { stringCompare } from "../../../../common/string/compare";
import { entityComboBoxKeys } from "../../../../data/entity/entity_picker";
import type { DeviceRegistryEntry } from "../../../../data/device/device_registry";
import { domainToName } from "../../../../data/integration";
import { multiTermSortedSearch } from "../../../../resources/fuseMultiTerm";
import type { HomeAssistant } from "../../../../types";
import { isHelperDomain } from "../../../config/helpers/const";

export interface DeviceNode {
  id: string;
  name: string;
  entityIds: string[];
  children: DeviceNode[];
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

// Display fields are flat; search_labels match ha-entity-picker so the
// fuzzy weights and behavior stay consistent across pickers.
export interface SearchableEntity {
  id: string;
  name: string;
  area: string;
  parentDevice: string;
  device: string;
  domain: string;
  search_labels: {
    entityName: string | null;
    friendlyName: string | null;
    deviceName: string | null;
    parentDeviceName: string | null;
    areaName: string | null;
    domainName: string | null;
    entityId: string;
  };
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
}

export type EntityFuseIndex = FuseIndex<SearchableEntity>;

// Pre-built so the first keystroke in the search input doesn't trigger
// Fuse.createIndex (50-100ms on large registries).
export const buildSearchIndex = (
  entities: SearchableEntity[]
): EntityFuseIndex => Fuse.createIndex(entityComboBoxKeys, entities);

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

export interface BuildEntityTreeInput {
  states: HomeAssistant["states"];
  entities: HomeAssistant["entities"];
  devices: HomeAssistant["devices"];
  areas: HomeAssistant["areas"];
  floors: HomeAssistant["floors"];
  language: string | undefined;
  localize: HomeAssistant["localize"];
}

export function buildEntityTree(input: BuildEntityTreeInput): EntityTree {
  const {
    states,
    entities: entityReg,
    devices: deviceReg,
    areas: areaReg,
    floors: floorReg,
    language,
    localize,
  } = input;

  const areaDirectEntities = new Map<string, string[]>();
  const areaDeviceEntities = new Map<string, Map<string, string[]>>();
  const unassignedDeviceEntities = new Map<string, string[]>();
  const unassignedServiceEntities = new Map<string, string[]>();
  const unassignedHelperByDomain = new Map<string, string[]>();
  const unassignedEntityByDomain = new Map<string, string[]>();
  const searchableEntities: SearchableEntity[] = [];

  const addDeviceEntity = (
    bucket: Map<string, string[]>,
    device: DeviceRegistryEntry,
    entityId: string,
    areaId: string | undefined
  ) => {
    const list = bucket.get(device.id) ?? [];
    list.push(entityId);
    bucket.set(device.id, list);
    // A child device nests under its parent when both land in the same
    // bucket, so the parent needs a row even without entities of its own.
    const parent = device.parent_device_id
      ? deviceReg[device.parent_device_id]
      : undefined;
    if (
      parent &&
      !parent.disabled_by &&
      getDeviceAreaId(parent, deviceReg) === areaId &&
      (parent.entry_type === "service") === (device.entry_type === "service") &&
      !bucket.has(parent.id)
    ) {
      bucket.set(parent.id, []);
    }
  };

  for (const entityId of Object.keys(states)) {
    const stateObj = states[entityId];
    if (!stateObj) continue;

    const entry = entityReg[entityId];
    if (entry?.hidden) continue;

    const { device, parentDevice, area } = getEntityContext(
      stateObj,
      entityReg,
      deviceReg,
      areaReg,
      floorReg
    );
    const areaId = area?.area_id;
    const domain = computeDomain(entityId);

    const entityName = computeEntityName(stateObj, entityReg, deviceReg);
    const friendlyName = computeStateName(stateObj);
    const deviceName = device ? computeDeviceName(device) : undefined;
    const parentDeviceName = parentDevice
      ? computeDeviceName(parentDevice)
      : undefined;
    const areaName = area ? computeAreaName(area) : undefined;
    const domainName = domainToName(localize, domain);

    searchableEntities.push({
      id: entityId,
      name: entityName || friendlyName || entityId,
      area: areaName ?? "",
      parentDevice: parentDeviceName ?? "",
      device: deviceName ?? "",
      domain: domainName,
      search_labels: {
        entityName: entityName || null,
        friendlyName: friendlyName || null,
        deviceName: deviceName || null,
        parentDeviceName: parentDeviceName || null,
        areaName: areaName || null,
        domainName: domainName || null,
        entityId,
      },
    });

    if (!areaId || !areaReg[areaId]) {
      if (device) {
        const isService = device.entry_type === "service";
        const target = isService
          ? unassignedServiceEntities
          : unassignedDeviceEntities;
        addDeviceEntity(target, device, entityId, undefined);
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
      addDeviceEntity(byDevice, device!, entityId, areaId);
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

  const sortDeviceNodes = (nodes: DeviceNode[]) => {
    nodes.sort((a, b) => stringCompare(a.name, b.name, language));
    nodes.forEach((node) => sortDeviceNodes(node.children));
  };

  const buildDeviceNodes = (source: Map<string, string[]>): DeviceNode[] => {
    const nodes = new Map<string, DeviceNode>();
    for (const [id, ids] of source) {
      const device = deviceReg[id];
      nodes.set(id, {
        id,
        name: (device ? computeDeviceName(device) : undefined) ?? id,
        entityIds: ids.sort(sortByName),
        children: [],
      });
    }
    const roots: DeviceNode[] = [];
    for (const node of nodes.values()) {
      const parentId = deviceReg[node.id]?.parent_device_id;
      const parent = parentId ? nodes.get(parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    sortDeviceNodes(roots);
    return roots;
  };

  const buildAreaNode = (areaId: string): AreaNode | undefined => {
    const area = areaReg[areaId];
    if (!area) return undefined;
    const directIds = (areaDirectEntities.get(areaId) ?? []).sort(sortByName);
    const byDevice = areaDeviceEntities.get(areaId);
    const devices = byDevice ? buildDeviceNodes(byDevice) : [];
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
  const hierarchy = getAreasFloorHierarchy(floors, areas);

  const floorNodes: FloorNode[] = hierarchy.floors
    .map(({ id, areas: areaIds }) => {
      const floor = floorReg[id];
      const areaList = areaIds
        .map((areaId) => buildAreaNode(areaId))
        .filter((a): a is AreaNode => !!a);
      if (!areaList.length) return undefined;
      return {
        id: floor.floor_id,
        name: floor.name,
        icon: floor.icon,
        level: floor.level,
        areas: areaList,
      };
    })
    .filter((f): f is FloorNode => !!f);

  const otherAreas = hierarchy.areas
    .map((areaId) => buildAreaNode(areaId))
    .filter((a): a is AreaNode => !!a);

  const buildDomainGroups = (source: Map<string, string[]>): DomainGroup[] =>
    [...source.entries()]
      .map(([domain, ids]) => ({
        domain,
        name: domainToName(localize, domain),
        entityIds: ids.sort(sortByName),
      }))
      .sort((a, b) => stringCompare(a.name, b.name, language));

  const unassignedSections: UnassignedSection[] = [];
  const entityDomains = buildDomainGroups(unassignedEntityByDomain);
  if (entityDomains.length) {
    unassignedSections.push({
      id: "entities",
      iconPath: mdiShape,
      label: localize("ui.panel.lovelace.editor.cardpicker.entities"),
      domains: entityDomains,
    });
  }
  const helperDomains = buildDomainGroups(unassignedHelperByDomain);
  if (helperDomains.length) {
    unassignedSections.push({
      id: "helpers",
      iconPath: mdiToggleSwitch,
      label: localize("ui.panel.lovelace.editor.cardpicker.helpers"),
      domains: helperDomains,
    });
  }
  const orphanDevices = buildDeviceNodes(unassignedDeviceEntities);
  if (orphanDevices.length) {
    unassignedSections.push({
      id: "devices",
      iconPath: mdiPuzzle,
      label: localize("ui.panel.lovelace.editor.cardpicker.devices"),
      devices: orphanDevices,
    });
  }
  const orphanServices = buildDeviceNodes(unassignedServiceEntities);
  if (orphanServices.length) {
    unassignedSections.push({
      id: "services",
      iconPath: mdiHomeAssistant,
      label: localize("ui.panel.lovelace.editor.cardpicker.services"),
      devices: orphanServices,
    });
  }

  return {
    floors: floorNodes,
    otherAreas,
    unassignedSections,
    searchableEntities,
  };
}

const devicePathToEntity = (
  devices: DeviceNode[],
  parentKey: string,
  entityId: string
): string[] | undefined => {
  for (const device of devices) {
    const key = deviceKey(parentKey, device.id);
    if (device.entityIds.includes(entityId)) return [key];
    const nested = devicePathToEntity(device.children, key, entityId);
    if (nested) return [key, ...nested];
  }
  return undefined;
};

export function pathToEntity(tree: EntityTree, entityId: string): string[] {
  for (const floor of tree.floors) {
    const fKey = floorKey(floor.id);
    for (const area of floor.areas) {
      const aKey = areaKey(fKey, area.id);
      if (area.directEntityIds.includes(entityId)) return [fKey, aKey];
      const devicePath = devicePathToEntity(area.devices, aKey, entityId);
      if (devicePath) return [fKey, aKey, ...devicePath];
    }
  }

  const otherAreasFloor = floorKey(OTHER_AREAS_ID);
  for (const area of tree.otherAreas) {
    const aKey = areaKey(otherAreasFloor, area.id);
    if (area.directEntityIds.includes(entityId)) {
      return [otherAreasFloor, aKey];
    }
    const devicePath = devicePathToEntity(area.devices, aKey, entityId);
    if (devicePath) return [otherAreasFloor, aKey, ...devicePath];
  }

  for (const section of tree.unassignedSections) {
    const sKey = unassignedKey(section.id);
    if (section.devices) {
      const devicePath = devicePathToEntity(section.devices, sKey, entityId);
      if (devicePath) return [sKey, ...devicePath];
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
  entities: SearchableEntity[],
  index: EntityFuseIndex,
  filter: string,
  limit = 100
): SearchableEntity[] {
  if (!filter) return [];
  return multiTermSortedSearch(
    entities,
    filter,
    (item) => item.id,
    index
  ).slice(0, limit);
}
