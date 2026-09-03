import { configEntry, device } from "../helpers";
import type { ConnectivityFixtures } from "../types";

export const LOCAL_SOURCE = "00:1A:7D:DA:71:11";
export const PROXY_SOURCE = "E8:DB:84:A1:C2:30";
export const SHED_SOURCE = "A4:CF:12:9B:44:70";

const ADAPTER_ENTRY_ID = "mock-bluetooth";
const PROXY_LIVING_ENTRY_ID = "mock-bluetooth-proxy-living";
const PROXY_SHED_ENTRY_ID = "mock-bluetooth-proxy-shed";

export const bluetoothFixtures: ConnectivityFixtures = {
  components: ["bluetooth"],
  commands: ["bluetooth/"],
  configEntries: [
    {
      type: "hub",
      entry: configEntry(
        ADAPTER_ENTRY_ID,
        "bluetooth",
        `hci0 (${LOCAL_SOURCE})`,
        { source: "usb", supports_options: true }
      ),
    },
    {
      type: "hub",
      entry: configEntry(
        PROXY_LIVING_ENTRY_ID,
        "bluetooth",
        "Living room proxy",
        { source: "esphome" }
      ),
    },
    {
      type: "hub",
      entry: configEntry(PROXY_SHED_ENTRY_ID, "bluetooth", "Shed proxy", {
        source: "esphome",
      }),
    },
  ],
  // Adapters and proxies are matched to their scanner by the bluetooth
  // connection tuple, see ./mock.
  devices: [
    device(
      "bluetooth-hci0",
      "hci0",
      "Home Assistant",
      "Home Assistant Green",
      ADAPTER_ENTRY_ID,
      { connections: [["bluetooth", LOCAL_SOURCE]] }
    ),
    device(
      "bluetooth-proxy-living",
      "Living room proxy",
      "Espressif",
      "ESP32-C3",
      PROXY_LIVING_ENTRY_ID,
      { area_id: "living_room", connections: [["bluetooth", PROXY_SOURCE]] }
    ),
    device(
      "bluetooth-proxy-shed",
      "Shed proxy",
      "Espressif",
      "ESP32",
      PROXY_SHED_ENTRY_ID,
      { connections: [["bluetooth", SHED_SOURCE]] }
    ),
  ],
};
