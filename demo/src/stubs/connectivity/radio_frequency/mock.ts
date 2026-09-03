import type { RadioFrequencyTransmitter } from "../../../../../src/data/radio_frequency";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";

const TRANSMITTERS: RadioFrequencyTransmitter[] = [
  {
    entity_id: "radio_frequency.garage_bridge",
    device_id: "rf-bridge-garage",
    config_entry_id: "mock-rf-bridge",
    supported_frequency_ranges: [
      [315000000, 315000000],
      [433050000, 434790000],
    ],
    supported_modulations: ["ask", "ook"],
  },
  {
    entity_id: "radio_frequency.shed_bridge",
    device_id: "rf-bridge-shed",
    config_entry_id: "mock-rf-bridge",
    supported_frequency_ranges: [[433050000, 434790000]],
    supported_modulations: ["ook"],
  },
];

export const mockRadioFrequency = (hass: MockHomeAssistant) => {
  hass.mockWS("radio_frequency/list", () => ({
    transmitters: TRANSMITTERS,
  }));
};
