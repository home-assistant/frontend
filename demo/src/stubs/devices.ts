import type { DeviceRegistryEntry } from "../../../src/data/device/device_registry";
import { connectivityDevices } from "./connectivity/fixtures";
import { baseDevice } from "./device_registry";

export const demoDevices: DeviceRegistryEntry[] = [
  {
    ...baseDevice,
    id: "co2signal",
    name: "Electricity Maps",
    manufacturer: "Electricity Maps",
    model: "CO2 Signal",
    config_entries: ["co2signal"],
    primary_config_entry: "co2signal",
    entry_type: "service",
  },
  {
    ...baseDevice,
    id: "hue-bridge",
    name: "Philips Hue Bridge",
    manufacturer: "Signify",
    model: "Hue Bridge (BSB002)",
    sw_version: "1.50.0",
    config_entries: ["mock-hue"],
    primary_config_entry: "mock-hue",
    entry_type: null,
  },
  {
    ...baseDevice,
    id: "sonos-living",
    name: "Living Room",
    manufacturer: "Sonos",
    model: "One",
    config_entries: ["mock-sonos"],
    primary_config_entry: "mock-sonos",
    entry_type: null,
  },
  {
    ...baseDevice,
    id: "power-strip",
    name: "Power strip",
    manufacturer: "Acme",
    model: "Smart Power Strip",
    config_entries: ["mock-hue"],
    primary_config_entry: "mock-hue",
    entry_type: null,
  },
  // Child devices (logical parts of the power strip). They carry the parent's
  // inherited hardware fields, mirroring how resolveChildDevices fills them in
  // from the WebSocket, and reference the parent via parent_device_id.
  {
    ...baseDevice,
    id: "power-strip-outlet-1",
    name: "Outlet 1",
    manufacturer: "Acme",
    model: "Smart Power Strip",
    config_entries: ["mock-hue"],
    primary_config_entry: "mock-hue",
    entry_type: null,
    parent_device_id: "power-strip",
  },
  {
    ...baseDevice,
    id: "power-strip-outlet-2",
    name: "Outlet 2",
    manufacturer: "Acme",
    model: "Smart Power Strip",
    config_entries: ["mock-hue"],
    primary_config_entry: "mock-hue",
    entry_type: null,
    parent_device_id: "power-strip",
  },
  ...connectivityDevices,
];
