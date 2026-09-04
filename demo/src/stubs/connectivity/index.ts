import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { mockBluetooth } from "./bluetooth/mock";
import { mockSerial } from "./serial/mock";
import { mockMqtt } from "./mqtt/mock";
import { mockMatter } from "./matter/mock";
import { mockRadioFrequency } from "./radio_frequency/mock";

// The WebSocket mocks, code-split into the config panel chunk.
const MOCKS = [
  mockBluetooth,
  mockSerial,
  mockMatter,
  mockMqtt,
  mockRadioFrequency,
];

export const mockConnectivity = (hass: MockHomeAssistant) => {
  MOCKS.forEach((mock) => mock(hass));
};
