import { manifest } from "../../manifest";
import { configEntry } from "../helpers";
import type { ConnectivityFixtures } from "../types";

export const FLEXIT_ENTRY_ID = "mock-flexit";
export const SOLAREDGE_ENTRY_ID = "mock-solaredge";
export const FRONIUS_ENTRY_ID = "mock-fronius";

/** The RS-485 adapter the two serial devices share, as the Serial panel lists it. */
export const RS485_PORT = "/dev/ttyUSB1";

export const modbusFixtures: ConnectivityFixtures = {
  components: ["modbus"],
  commands: ["modbus/"],
  manifests: [
    manifest("flexit", "Flexit", {
      integration_type: "device",
      iot_class: "local_polling",
    }),
    manifest("solaredge_modbus", "SolarEdge Modbus", {
      integration_type: "device",
      iot_class: "local_polling",
    }),
    manifest("fronius", "Fronius", {
      integration_type: "device",
      iot_class: "local_polling",
    }),
  ],
  configEntries: [
    {
      type: "device",
      entry: configEntry(FLEXIT_ENTRY_ID, "flexit", "Flexit Nordic S4"),
    },
    {
      type: "device",
      entry: configEntry(
        SOLAREDGE_ENTRY_ID,
        "solaredge_modbus",
        "SolarEdge SE7K"
      ),
    },
    {
      type: "device",
      entry: configEntry(FRONIUS_ENTRY_ID, "fronius", "Fronius Symo"),
    },
  ],
};
