import { DeviceRegistryEntry } from "../../../src/data/device_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockDeviceRegistry = (
  hass: MockHomeAssistant,
  data: DeviceRegistryEntry[] = []
) => hass.mockWS("config/device_registry/list", () => data);
