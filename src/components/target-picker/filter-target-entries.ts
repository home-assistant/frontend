import { getDeviceAreaId } from "../../common/entity/context/get_device_context";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import {
  areaMeetsFilter,
  deviceMeetsFilter,
  entityRegMeetsFilter,
  type ExtractFromTargetResultReferenced,
  type TargetItem,
} from "../../data/target";
import type { HomeAssistant } from "../../types";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";

export interface TargetEntriesFilters {
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  includeDomains?: string[];
  includeDeviceClasses?: string[];
  primaryEntitiesOnly?: boolean;
}

/**
 * What a target item resolved to, narrowed to what passes the filters. Used
 * by the target rows and by the exclusions, so what an exclusion takes out
 * matches what a row counts.
 */
export const filterTargetEntries = <
  T extends ExtractFromTargetResultReferenced,
>(
  hass: HomeAssistant,
  item: TargetItem,
  entries: T,
  filters: TargetEntriesFilters
): T => {
  let referencedAreas = entries.referenced_areas;
  const hiddenAreaIds: string[] = [];
  if (item.type === "floor" || item.type === "label") {
    referencedAreas = referencedAreas.filter((area_id) => {
      const area = hass.areas[area_id];
      // Absent from the registry is not a filter decision: drop the id
      // without marking it hidden, so entities targeted through their
      // own area or label are not dropped along with it.
      if (!area) {
        return false;
      }
      if (
        (item.type === "floor" || area.labels.includes(item.id)) &&
        areaMeetsFilter(
          area,
          hass.devices,
          hass.entities,
          filters.deviceFilter,
          filters.includeDomains,
          filters.includeDeviceClasses,
          hass.states,
          filters.entityFilter,
          !filters.primaryEntitiesOnly
        )
      ) {
        return true;
      }

      hiddenAreaIds.push(area_id);
      return false;
    });
  }

  let referencedDevices = entries.referenced_devices;
  const hiddenDeviceIds: string[] = [];
  // Parents kept only so a matching child device can nest under them;
  // their own entities stay filtered out like a hidden device's.
  const groupOnlyDeviceIds = new Set<string>();
  if (item.type === "floor" || item.type === "area" || item.type === "label") {
    const matchingDeviceIds = new Set(
      referencedDevices.filter((device_id) => {
        const device = hass.devices[device_id];
        return (
          !!device &&
          !hiddenAreaIds.includes(
            getDeviceAreaId(device, hass.devices) || ""
          ) &&
          deviceMeetsFilter(
            device,
            hass.entities,
            filters.deviceFilter,
            filters.includeDomains,
            filters.includeDeviceClasses,
            hass.states,
            filters.entityFilter,
            !filters.primaryEntitiesOnly
          )
        );
      })
    );
    const parentsOfMatching = new Set(
      [...matchingDeviceIds].map(
        (device_id) => hass.devices[device_id].parent_device_id
      )
    );
    referencedDevices = referencedDevices.filter((device_id) => {
      // Absent from the registry is not a filter decision: drop the id
      // without marking it hidden, like the area filtering above.
      if (!hass.devices[device_id]) {
        return false;
      }
      if (matchingDeviceIds.has(device_id)) {
        return true;
      }
      if (parentsOfMatching.has(device_id)) {
        groupOnlyDeviceIds.add(device_id);
        return true;
      }
      hiddenDeviceIds.push(device_id);
      return false;
    });
  }

  const referencedEntities = entries.referenced_entities.filter((entity_id) => {
    const entity = hass.entities[entity_id];
    // Core can reference entities that are absent from the display
    // registry (e.g. disabled ones expanded from an area).
    if (!entity) {
      return false;
    }
    if (
      hiddenDeviceIds.includes(entity.device_id || "") ||
      groupOnlyDeviceIds.has(entity.device_id || "")
    ) {
      return false;
    }
    if (
      (item.type === "area" && entity.area_id === item.id) ||
      (item.type === "floor" &&
        entity.area_id &&
        referencedAreas.includes(entity.area_id)) ||
      (item.type === "label" && entity.labels.includes(item.id)) ||
      referencedDevices.includes(entity.device_id || "")
    ) {
      return entityRegMeetsFilter(
        entity,
        item.type === "label" || !filters.primaryEntitiesOnly,
        filters.includeDomains,
        filters.includeDeviceClasses,
        hass.states,
        filters.entityFilter
      );
    }
    return false;
  });

  return {
    ...entries,
    referenced_areas: referencedAreas,
    referenced_devices: referencedDevices,
    referenced_entities: referencedEntities,
  };
};
