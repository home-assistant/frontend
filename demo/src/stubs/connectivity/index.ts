import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { mockBluetooth } from "./bluetooth";
import { mockMatter } from "./matter";
import { mockMqtt } from "./mqtt";
import { mockRadioFrequency } from "./radio_frequency";
import { mockThread } from "./thread";
import { mockUsb } from "./usb";
import { mockZha } from "./zha";
import { mockZwaveJs } from "./zwave_js";

export const mockConnectivity = (hass: MockHomeAssistant) => {
  mockBluetooth(hass);
  mockMatter(hass);
  mockThread(hass);
  mockZha(hass);
  mockZwaveJs(hass);
  mockMqtt(hass);
  mockUsb(hass);
  mockRadioFrequency(hass);
};
