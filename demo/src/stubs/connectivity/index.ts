import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { mockBluetooth } from "./bluetooth/mock";
import { mockMatter } from "./matter/mock";
import { mockMqtt } from "./mqtt/mock";
import { mockRadioFrequency } from "./radio_frequency/mock";
import { mockSerial } from "./serial/mock";
import { mockThread } from "./thread/mock";
import { mockZha } from "./zha/mock";
import { mockZwaveJs } from "./zwave_js/mock";

// The WebSocket mocks, code-split into the config panel chunk. Infrared and
// tags are absent because their panels read no connectivity-specific commands.
const MOCKS = [
  mockBluetooth,
  mockMatter,
  mockMqtt,
  mockRadioFrequency,
  mockSerial,
  mockThread,
  mockZha,
  mockZwaveJs,
];

export const mockConnectivity = (hass: MockHomeAssistant) => {
  MOCKS.forEach((mock) => mock(hass));
};
