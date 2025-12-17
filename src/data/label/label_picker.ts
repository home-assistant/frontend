import { mdiLabel } from "@mdi/js";
import { computeDomain } from "../../common/entity/compute_domain";
import type { HaDevicePickerDeviceFilterFunc } from "../../components/device/ha-device-picker";
import type { PickerComboBoxItem } from "../../components/ha-picker-combo-box";
import type { FuseWeightedKey } from "../../resources/fuseMultiTerm";
import type { HomeAssistant } from "../../types";
import {
  getDeviceEntityDisplayLookup,
  type DeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "../device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../entity/entity";
import type { EntityRegistryDisplayEntry } from "../entity/entity_registry";
import type { LabelRegistryEntry } from "./label_registry";

export const labelComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "search_labels.name",
    weight: 10,
  },
  {
    name: "search_labels.description",
    weight: 5,
  },
  {
    name: "search_labels.id",
    weight: 4,
  },
];

export const getLabels = (
  hassStates: HomeAssistant["states"],
  hassAreas: HomeAssistant["areas"],
  hassDevices: HomeAssistant["devices"],
  hassEntities: HomeAssistant["entities"],
  labels?: LabelRegistryEntry[],
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeLabels?: string[],
  idPrefix = ""
): PickerComboBoxItem[] => {
  if (!labels || labels.length === 0) {
    return [];
  }

  const devices = Object.values(hassDevices);
  const entities = Object.values(hassEntities);

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
    inputEntities = entities.filter((entity) => entity.labels.length > 0);

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
          const stateObj = hassStates[entity.entity_id];
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
        const stateObj = hassStates[entity.entity_id];
        return (
          stateObj &&
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
          const stateObj = hassStates[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return entityFilter(stateObj);
        });
      });
      inputEntities = inputEntities!.filter((entity) => {
        const stateObj = hassStates[entity.entity_id];
        if (!stateObj) {
          return false;
        }
        return entityFilter!(stateObj);
      });
    }
  }

  let outputLabels = labels;
  const usedLabels = new Set<string>();

  let areaIds: string[] | undefined;

  if (inputDevices) {
    areaIds = inputDevices
      .filter((device) => device.area_id)
      .map((device) => device.area_id!);

    inputDevices.forEach((device) => {
      device.labels.forEach((label) => usedLabels.add(label));
    });
  }

  if (inputEntities) {
    areaIds = (areaIds ?? []).concat(
      inputEntities
        .filter((entity) => entity.area_id)
        .map((entity) => entity.area_id!)
    );
    inputEntities.forEach((entity) => {
      entity.labels.forEach((label) => usedLabels.add(label));
    });
  }

  if (areaIds) {
    areaIds.forEach((areaId) => {
      const area = hassAreas[areaId];
      area?.labels.forEach((label) => usedLabels.add(label));
    });
  }

  if (excludeLabels) {
    outputLabels = outputLabels.filter(
      (label) => !excludeLabels!.includes(label.label_id)
    );
  }

  if (inputDevices || inputEntities) {
    outputLabels = outputLabels.filter((label) =>
      usedLabels.has(label.label_id)
    );
  }

  const items = outputLabels.map<PickerComboBoxItem>((label) => ({
    id: `${idPrefix}${label.label_id}`,
    primary: label.name,
    secondary: label.description ?? "",
    icon: label.icon || undefined,
    icon_path: label.icon ? undefined : mdiLabel,
    sorting_label: label.name,
    search_labels: {
      name: label.name,
      description: label.description,
      id: label.label_id,
    },
  }));

  return items;
};
