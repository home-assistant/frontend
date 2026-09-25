import type { RadioFrequencyTransmitter } from "../../../../../src/data/radio_frequency";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";

const TRANSMITTERS: RadioFrequencyTransmitter[] = [
  {
    entity_id: "radio_frequency.garage_bridge",
    device_id: "rf-bridge-garage",
    config_entry_id: "mock-rf-bridge",
    supported_frequency_ranges: [[433920000, 433920000]],
    supported_modulations: ["OOK"],
  },
  {
    entity_id: "radio_frequency.shed_bridge",
    device_id: "rf-bridge-shed",
    config_entry_id: "mock-rf-bridge",
    supported_frequency_ranges: [[433920000, 433920000]],
    supported_modulations: ["OOK"],
  },
];

export const mockRadioFrequency = (hass: MockHomeAssistant) => {
  hass.mockWS("radio_frequency/list", () => ({
    transmitters: TRANSMITTERS,
  }));
};
