import { LabelRegistryEntry } from "../../../src/data/label_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockLabelRegistry = (
  hass: MockHomeAssistant,
  data: LabelRegistryEntry[] = []
) => hass.mockWS("config/label_registry/list", () => data);
