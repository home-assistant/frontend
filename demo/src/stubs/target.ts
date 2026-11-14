import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../src/common/array/ensure-array";
import type { ExtractFromTargetResult } from "../../../src/data/target";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { getLabelIds } from "./label_registry";

// Expands a target to its areas, devices and entities, like core does
export const expandTarget = (
  hass: MockHomeAssistant,
  target: HassServiceTarget,
  primaryEntitiesOnly = true
) => {
  const missing = {
    floors: [] as string[],
    areas: [] as string[],
    devices: [] as string[],
    labels: [] as string[],
  };
  const knownLabelIds = getLabelIds();
  const floorIds = ensureArray(target.floor_id ?? []);
  const labelIds = ensureArray(target.label_id ?? []);
  missing.floors.push(...floorIds.filter((id) => !(id in hass.floors)));
  // Like core, unknown labels are reported, but still expanded
  missing.labels.push(...labelIds.filter((id) => !knownLabelIds.includes(id)));
  const hasLabel = (labels?: string[]) =>
    labelIds.some((labelId) => labels?.includes(labelId));

  // Unknown areas and devices are reported, but still referenced
  const areaIds = new Set(ensureArray(target.area_id ?? []));
  missing.areas.push(...[...areaIds].filter((id) => !(id in hass.areas)));
  for (const area of Object.values(hass.areas)) {
    if (
      (area.floor_id && floorIds.includes(area.floor_id)) ||
      hasLabel(area.labels)
    ) {
      areaIds.add(area.area_id);
    }
  }

  // A targeted or labeled device includes its child devices
  const deviceIds = new Set<string>();
  const addDevice = (deviceId: string) => {
    deviceIds.add(deviceId);
    for (const device of Object.values(hass.devices)) {
      if (device.parent_device_id === deviceId) {
        deviceIds.add(device.id);
      }
    }
  };
  for (const deviceId of ensureArray(target.device_id ?? [])) {
    if (!(deviceId in hass.devices)) {
      missing.devices.push(deviceId);
    }
    addDevice(deviceId);
  }
  for (const device of Object.values(hass.devices)) {
    if (hasLabel(device.labels)) {
      addDevice(device.id);
    }
  }

  // A child device without its own area is in the area of its parent device
  const deviceArea = (deviceId: string) => {
    const device = hass.devices[deviceId];
    return (
      device?.area_id ??
      (device?.parent_device_id
        ? hass.devices[device.parent_device_id]?.area_id
        : undefined)
    );
  };
  const areaDeviceIds = new Set<string>();
  for (const device of Object.values(hass.devices)) {
    const areaId = deviceArea(device.id);
    if (areaId && areaIds.has(areaId)) {
      areaDeviceIds.add(device.id);
    }
  }

  const entityIds = new Set(ensureArray(target.entity_id ?? []));
  for (const entity of Object.values(hass.entities)) {
    // The display registry keeps the entities of a previous demo, and like
    // core, hidden entities are never included indirectly
    if (!(entity.entity_id in hass.states) || entity.hidden) {
      continue;
    }
    const primary = !primaryEntitiesOnly || !entity.entity_category;
    if (
      hasLabel(entity.labels) ||
      (primary &&
        ((entity.device_id && deviceIds.has(entity.device_id)) ||
          (entity.area_id && areaIds.has(entity.area_id)) ||
          // An entity with its own area is not in the area of its device
          (!entity.area_id &&
            entity.device_id &&
            areaDeviceIds.has(entity.device_id))))
    ) {
      entityIds.add(entity.entity_id);
    }
  }

  return {
    areas: [...areaIds],
    devices: [...new Set([...deviceIds, ...areaDeviceIds])],
    entities: [...entityIds],
    missing,
  };
};

export const mockExtractFromTarget = (hass: MockHomeAssistant) =>
  hass.mockWS(
    "extract_from_target",
    (
      msg: { target: HassServiceTarget; primary_entities_only?: boolean },
      currentHass: MockHomeAssistant
    ): ExtractFromTargetResult => {
      const { areas, devices, entities, missing } = expandTarget(
        currentHass,
        msg.target,
        msg.primary_entities_only ?? true
      );
      return {
        missing_areas: missing.areas,
        missing_devices: missing.devices,
        missing_floors: missing.floors,
        missing_labels: missing.labels,
        referenced_areas: areas,
        referenced_devices: devices,
        referenced_entities: entities,
      };
    }
  );
