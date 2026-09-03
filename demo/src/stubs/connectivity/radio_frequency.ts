import type { RadioFrequencyTransmitter } from "../../../../src/data/radio_frequency";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";

const TRANSMITTERS: RadioFrequencyTransmitter[] = [
  {
    entity_id: "radio_frequency.living_room_blaster",
    device_id: "broadlink-living-room",
    config_entry_id: "mock-broadlink",
    supported_frequency_ranges: [
      [315000000, 315000000],
      [433050000, 434790000],
    ],
    supported_modulations: ["ask", "ook"],
  },
  {
    entity_id: "radio_frequency.bedroom_blaster",
    device_id: "broadlink-bedroom",
    config_entry_id: "mock-broadlink",
    supported_frequency_ranges: [[433050000, 434790000]],
    supported_modulations: ["ook"],
  },
];

export const mockRadioFrequency = (hass: MockHomeAssistant) => {
  hass.mockWS("radio_frequency/list", () => ({
    transmitters: TRANSMITTERS,
  }));
};
