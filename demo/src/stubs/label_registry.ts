import type { LabelRegistryEntry } from "../../../src/data/label/label_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { removeLabelFromEntityRegistry } from "./entity_registry";

let labels: LabelRegistryEntry[] = [];

export const getLabelIds = () => labels.map((label) => label.label_id);

export const mockLabelRegistry = (
  hass: MockHomeAssistant,
  data: LabelRegistryEntry[] = []
) => {
  labels = [...data];
  hass.mockWS("config/label_registry/list", () =>
    labels.map((label) => ({ ...label }))
  );
  hass.mockWS(
    "config/label_registry/delete",
    (msg: { label_id: string }, currentHass: MockHomeAssistant) => {
      const index = labels.findIndex(
        (label) => label.label_id === msg.label_id
      );
      if (index === -1) {
        throw new Error(`Label ${msg.label_id} not found`);
      }
      labels.splice(index, 1);
      removeLabelFromEntityRegistry(currentHass, msg.label_id);
      hass.mockEvent("label_registry_updated");
    }
  );
};
