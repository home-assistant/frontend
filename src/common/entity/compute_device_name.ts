import memoizeOne from "memoize-one";
import type { DeviceRegistryEntry } from "../../data/device/device_registry";
import type { HomeAssistant } from "../../types";
import { getDuplicates } from "../string/get_duplicates";

export const computeDeviceName = (
  device: DeviceRegistryEntry
): string | undefined => (device.name_by_user || device.name)?.trim();

export const computeDeviceNameDisplay = (
  device: DeviceRegistryEntry,
  localize: HomeAssistant["localize"]
) =>
  computeDeviceName(device) ||
  localize("ui.panel.config.devices.unnamed_device", {
    type: localize(
      `ui.panel.config.devices.type.${device.entry_type || "device"}`
    ),
  });

export const getDuplicatedDeviceNames = memoizeOne(
  (devices: HomeAssistant["devices"]): Set<string> => {
    const names = Object.values(devices)
      .map((device) => computeDeviceName(device))
      .filter((name): name is string => name !== undefined);

    return getDuplicates(names);
  }
);
