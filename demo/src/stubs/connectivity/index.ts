import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { mockBluetooth } from "./bluetooth/mock";
import { mockSerial } from "./serial/mock";
import { mockRadioFrequency } from "./radio_frequency/mock";

// The WebSocket mocks, code-split into the config panel chunk.
const MOCKS = [mockBluetooth, mockSerial, mockRadioFrequency];

export const mockConnectivity = (hass: MockHomeAssistant) => {
  MOCKS.forEach((mock) => mock(hass));
};
