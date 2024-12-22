import { FloorRegistryEntry } from "../../../src/data/floor_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockFloorRegistry = (
  hass: MockHomeAssistant,
  data: FloorRegistryEntry[] = []
) => hass.mockWS("config/floor_registry/list", () => data);
