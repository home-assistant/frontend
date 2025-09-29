import memoizeOne from "memoize-one";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeDomain } from "../common/entity/compute_domain";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { stringCompare } from "../common/string/compare";
import type { HaDevicePickerDeviceFilterFunc } from "../components/device/ha-device-picker";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { HomeAssistant } from "../types";
import type { AreaRegistryEntry } from "./area_registry";
import {
  getDeviceEntityDisplayLookup,
  type DeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "./device_registry";
import type { HaEntityPickerEntityFilterFunc } from "./entity";
import type { EntityRegistryDisplayEntry } from "./entity_registry";
import { getFloorAreaLookup, type FloorRegistryEntry } from "./floor_registry";

export interface FloorComboBoxItem extends PickerComboBoxItem {
  type: "floor" | "area";
  floor?: FloorRegistryEntry;
  area?: AreaRegistryEntry;
}

export interface AreaFloorValue {
  id: string;
  type: "floor" | "area";
}

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
  memoizeOne(
    (
      haFloorsMemo: HomeAssistant["floors"],
      haAreasMemo: HomeAssistant["areas"],
      haDevicesMemo: HomeAssistant["devices"],
      haEntitiesMemo: HomeAssistant["entities"],
      includeDomainsMemo?: string[],
      excludeDomainsMemo?: string[],
      includeDeviceClassesMemo?: string[],
      deviceFilterMemo?: HaDevicePickerDeviceFilterFunc,
      entityFilterMemo?: HaEntityPickerEntityFilterFunc,
      excludeAreasMemo?: string[],
      excludeFloorsMemo?: string[]
    ): FloorComboBoxItem[] => {
      const floors = Object.values(haFloorsMemo);
      const areas = Object.values(haAreasMemo);
      const devices = Object.values(haDevicesMemo);
      const entities = Object.values(haEntitiesMemo);

      let deviceEntityLookup: DeviceEntityDisplayLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryDisplayEntry[] | undefined;

      if (
        includeDomainsMemo ||
        excludeDomainsMemo ||
        includeDeviceClassesMemo ||
        deviceFilterMemo ||
        entityFilterMemo
      ) {
        deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
        inputDevices = devices;
        inputEntities = entities.filter((entity) => entity.area_id);

        if (includeDomainsMemo) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) =>
              includeDomainsMemo.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter((entity) =>
            includeDomainsMemo.includes(computeDomain(entity.entity_id))
          );
        }

        if (excludeDomainsMemo) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return true;
            }
            return entities.every(
              (entity) =>
                !excludeDomainsMemo.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter(
            (entity) =>
              !excludeDomainsMemo.includes(computeDomain(entity.entity_id))
          );
        }

        if (includeDeviceClassesMemo) {
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
                includeDeviceClassesMemo.includes(
                  stateObj.attributes.device_class
                )
              );
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = states[entity.entity_id];
            return (
              stateObj.attributes.device_class &&
              includeDeviceClassesMemo.includes(
                stateObj.attributes.device_class
              )
            );
          });
        }

        if (deviceFilterMemo) {
          inputDevices = inputDevices!.filter((device) =>
            deviceFilterMemo!(device)
          );
        }

        if (entityFilterMemo) {
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
              return entityFilterMemo(stateObj);
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = states[entity.entity_id];
            if (!stateObj) {
              return false;
            }
            return entityFilterMemo!(stateObj);
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
        outputAreas = outputAreas.filter((area) =>
          areaIds!.includes(area.area_id)
        );
      }

      if (excludeAreasMemo) {
        outputAreas = outputAreas.filter(
          (area) => !excludeAreasMemo!.includes(area.area_id)
        );
      }

      if (excludeFloorsMemo) {
        outputAreas = outputAreas.filter(
          (area) =>
            !area.floor_id || !excludeFloorsMemo!.includes(area.floor_id)
        );
      }

      const floorAreaLookup = getFloorAreaLookup(outputAreas);
      const unassisgnedAreas = Object.values(outputAreas).filter(
        (area) => !area.floor_id || !floorAreaLookup[area.floor_id]
      );

      // @ts-ignore
      const floorAreaEntries: [
        FloorRegistryEntry | undefined,
        AreaRegistryEntry[],
      ][] = Object.entries(floorAreaLookup)
        .map(([floorId, floorAreas]) => {
          const floor = floors.find((fl) => fl.floor_id === floorId)!;
          return [floor, floorAreas] as const;
        })
        .sort(([floorA], [floorB]) => {
          if (floorA.level !== floorB.level) {
            return (floorA.level ?? 0) - (floorB.level ?? 0);
          }
          return stringCompare(floorA.name, floorB.name);
        });

      const items: FloorComboBoxItem[] = [];

      floorAreaEntries.forEach(([floor, floorAreas]) => {
        if (floor) {
          const floorName = computeFloorName(floor);

          const areaSearchLabels = floorAreas
            .map((area) => {
              const areaName = computeAreaName(area) || area.area_id;
              return [area.area_id, areaName, ...area.aliases];
            })
            .flat();

          items.push({
            id: formatId({ id: floor.floor_id, type: "floor" }),
            type: "floor",
            primary: floorName,
            floor: floor,
            search_labels: [
              floor.floor_id,
              floorName,
              ...floor.aliases,
              ...areaSearchLabels,
            ],
          });
        }
        items.push(
          ...floorAreas.map((area) => {
            const areaName = computeAreaName(area) || area.area_id;
            return {
              id: formatId({ id: area.area_id, type: "area" }),
              type: "area" as const,
              primary: areaName,
              area: area,
              icon: area.icon || undefined,
              search_labels: [area.area_id, areaName, ...area.aliases],
            };
          })
        );
      });

      items.push(
        ...unassisgnedAreas.map((area) => {
          const areaName = computeAreaName(area) || area.area_id;
          return {
            id: formatId({ id: area.area_id, type: "area" }),
            type: "area" as const,
            primary: areaName,
            area: area,
            icon: area.icon || undefined,
            search_labels: [area.area_id, areaName, ...area.aliases],
          };
        })
      );

      return items;
    }
  )(
    haFloors,
    haAreas,
    haDevices,
    haEntities,
    includeDomains,
    excludeDomains,
    includeDeviceClasses,
    deviceFilter,
    entityFilter,
    excludeAreas,
    excludeFloors
  );
