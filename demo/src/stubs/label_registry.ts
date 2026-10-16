import type { LabelRegistryEntry } from "../../../src/data/label/label_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

let labels: LabelRegistryEntry[] = [];

export const getLabelIds = () => labels.map((label) => label.label_id);

export const mockLabelRegistry = (
  hass: MockHomeAssistant,
  data: LabelRegistryEntry[] = []
) => {
  labels = data;
  hass.mockWS("config/label_registry/list", () => data);
  hass.mockWS("config/label_registry/delete", (msg: { label_id: string }) => {
    const index = data.findIndex((label) => label.label_id === msg.label_id);
    if (index !== -1) {
      data.splice(index, 1);
    }
  });
};
