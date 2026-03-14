import { mdiTextureBox } from "@mdi/js";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeFloorName } from "../../common/entity/compute_floor_name";
import { getAreaContext } from "../../common/entity/context/get_area_context";
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

export const getAreas = (
  haAreas: HomeAssistant["areas"],
  haFloors: HomeAssistant["floors"],
  haDevices: HomeAssistant["devices"],
  haEntities: HomeAssistant["entities"],
  haStates: HomeAssistant["states"],
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeAreas?: string[],
  idPrefix = ""
): PickerComboBoxItem[] => {
  let deviceEntityLookup: DeviceEntityDisplayLookup = {};
  let inputDevices: DeviceRegistryEntry[] | undefined;
  let inputEntities: EntityRegistryDisplayEntry[] | undefined;

  const areas = Object.values(haAreas);
  const devices = Object.values(haDevices);
  const entities = Object.values(haEntities);

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
          const stateObj = haStates[entity.entity_id];
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
        const stateObj = haStates[entity.entity_id];
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
          const stateObj = haStates[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return entityFilter(stateObj);
        });
      });
      inputEntities = inputEntities!.filter((entity) => {
        const stateObj = haStates[entity.entity_id];
        if (!stateObj) {
          return false;
        }
        return entityFilter!(stateObj);
      });
    }
  }

  let outputAreas = areas;

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

  const items = outputAreas.map<PickerComboBoxItem>((area) => {
    const { floor } = getAreaContext(area, haFloors);
    const floorName = floor ? computeFloorName(floor) : undefined;
    const areaName = computeAreaName(area);
    return {
      id: `${idPrefix}${area.area_id}`,
      primary: areaName || area.area_id,
      secondary: floorName,
      icon: area.icon || undefined,
      icon_path: area.icon ? undefined : mdiTextureBox,
      search_labels: {
        areaId: area.area_id,
        aliases: area.aliases.join(" "),
      },
    };
  });

  return items;
};

export const areaComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "search_labels.aliases",
    weight: 8,
  },
  {
    name: "secondary",
    weight: 6,
  },
  {
    name: "search_labels.domain",
    weight: 4,
  },
  {
    name: "search_labels.areaId",
    weight: 2,
  },
];
