import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeStateName } from "../../common/entity/compute_state_name";
import { generateEntityFilter } from "../../common/entity/entity_filter";
import { clamp } from "../../common/number/clamp";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import {
  findBatteryEntity,
  type EntityRegistryDisplayEntry,
} from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";

export const DEFAULT_BATTERY_ATTENTION_THRESHOLD = 30;

export interface MaintenanceBatteryDevice {
  deviceId: string;
  deviceName: string;
  entityId: string;
  level: number;
  needsAttention: boolean;
}

export const normalizeBatteryAttentionThreshold = (
  threshold?: number
): number =>
  typeof threshold === "number" && !Number.isNaN(threshold)
    ? clamp(Math.round(threshold), 0, 100)
    : DEFAULT_BATTERY_ATTENTION_THRESHOLD;

export const getMaintenanceBatteryDevices = (
  hass: HomeAssistant,
  attentionThreshold?: number
): MaintenanceBatteryDevice[] => {
  const normalizedThreshold =
    normalizeBatteryAttentionThreshold(attentionThreshold);

  const batteryFilter = generateEntityFilter(hass, {
    domain: "sensor",
    device_class: "battery",
  });

  const entitiesByDevice: Record<string, EntityRegistryDisplayEntry[]> = {};

  for (const entry of Object.values(hass.entities)) {
    if (!entry.device_id || !(entry.entity_id in hass.states)) {
      continue;
    }

    if (!batteryFilter(entry.entity_id)) {
      continue;
    }

    if (!(entry.device_id in entitiesByDevice)) {
      entitiesByDevice[entry.device_id] = [];
    }

    entitiesByDevice[entry.device_id].push(entry);
  }

  return Object.entries(entitiesByDevice)
    .flatMap(([deviceId, entities]) => {
      const batteryEntity = findBatteryEntity(hass, entities);

      if (!batteryEntity) {
        return [];
      }

      const stateObj = hass.states[batteryEntity.entity_id];
      const level = Number(stateObj?.state);

      if (!stateObj || !Number.isFinite(level)) {
        return [];
      }

      const device = hass.devices[deviceId];
      const deviceName =
        (device && computeDeviceName(device)) ||
        computeStateName(stateObj) ||
        hass.localize("ui.panel.lovelace.strategy.home.unnamed_device");

      return [
        {
          deviceId,
          deviceName,
          entityId: batteryEntity.entity_id,
          level,
          needsAttention: level < normalizedThreshold,
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.needsAttention) - Number(a.needsAttention) ||
        a.level - b.level ||
        caseInsensitiveStringCompare(a.deviceName, b.deviceName)
    );
};

export const countMaintenanceDevicesNeedingAttention = (
  hass: HomeAssistant,
  attentionThreshold?: number
): number =>
  getMaintenanceBatteryDevices(hass, attentionThreshold).filter(
    (device) => device.needsAttention
  ).length;
