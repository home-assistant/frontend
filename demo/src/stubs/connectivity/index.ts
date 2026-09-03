import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { mockBluetooth } from "./bluetooth/mock";
import { mockMqtt } from "./mqtt/mock";

// The WebSocket mocks, code-split into the config panel chunk.
const MOCKS = [mockBluetooth, mockMqtt];

export const mockConnectivity = (hass: MockHomeAssistant) => {
  MOCKS.forEach((mock) => mock(hass));
};
