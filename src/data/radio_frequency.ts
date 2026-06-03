import type { HomeAssistant } from "../types";

export interface RadioFrequencyTransmitter {
  entity_id: string;
  device_id: string | null;
  config_entry_id: string | null;
  name: string | null;
  supported_frequency_ranges: [number, number][];
  supported_modulations: string[];
}

interface RadioFrequencyTransmitterList {
  transmitters: RadioFrequencyTransmitter[];
}

export const fetchRadioFrequencyTransmitters = (
  hass: HomeAssistant
): Promise<RadioFrequencyTransmitterList> =>
  hass.callWS({
    type: "radio_frequency/list",
  });
