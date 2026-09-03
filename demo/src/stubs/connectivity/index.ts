import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { mockBluetooth } from "./bluetooth/mock";

// The WebSocket mocks, code-split into the config panel chunk.
// Tags are absent because their panels read no
// connectivity-specific commands.
const MOCKS = [mockBluetooth];

export const mockConnectivity = (hass: MockHomeAssistant) => {
  MOCKS.forEach((mock) => mock(hass));
};
