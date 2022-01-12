import { AreaRegistryEntry } from "../../../src/data/area_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockAreaRegistry = (
  hass: MockHomeAssistant,
  data: AreaRegistryEntry[] = []
) => hass.mockWS("config/area_registry/list", () => data);
