import memoizeOne from "memoize-one";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { computeStateName } from "./compute_state_name";
import { getDuplicates } from "../string/get_duplicates";

export const computeDeviceName = (
  device: DeviceRegistryEntry
): string | undefined => (device.name_by_user || device.name)?.trim();

export const computeDeviceNameDisplay = (
  device: DeviceRegistryEntry,
  hass: HomeAssistant,
  entities?: EntityRegistryEntry[] | EntityRegistryDisplayEntry[] | string[]
) =>
  computeDeviceName(device) ||
  (entities && fallbackDeviceName(hass, entities)) ||
  hass.localize("ui.panel.config.devices.unnamed_device", {
    type: hass.localize(
      `ui.panel.config.devices.type.${device.entry_type || "device"}`
    ),
  });

export const fallbackDeviceName = (
  hass: HomeAssistant,
  entities: EntityRegistryEntry[] | EntityRegistryDisplayEntry[] | string[]
) => {
  for (const entity of entities || []) {
    const entityId = typeof entity === "string" ? entity : entity.entity_id;
    const stateObj = hass.states[entityId];
    if (stateObj) {
      return computeStateName(stateObj);
    }
  }
  return undefined;
};

export const getDuplicatedDeviceNames = memoizeOne(
  (devices: HomeAssistant["devices"]): Set<string> => {
    const names = Object.values(devices)
      .map((device) => computeDeviceName(device))
      .filter((name): name is string => name !== undefined);

    return getDuplicates(names);
  }
);
