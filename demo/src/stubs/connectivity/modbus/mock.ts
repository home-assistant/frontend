import type { ModbusConnection } from "../../../../../src/data/modbus";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import {
  FLEXIT_ENTRY_ID,
  FRONIUS_ENTRY_ID,
  RS485_PORT,
  SOLAREDGE_ENTRY_ID,
} from "./fixtures";

const CONNECTIONS: ModbusConnection[] = [
  // Two integrations on one RS-485 bus, which is what the panel exists to show
  {
    endpoint: ["serial", RS485_PORT],
    connected: true,
    source: "config_entry",
    units: { [FLEXIT_ENTRY_ID]: [1], [SOLAREDGE_ENTRY_ID]: [2] },
  },
  {
    endpoint: ["tcp", "192.168.1.42", 502],
    connected: true,
    source: "config_entry",
    units: { [FRONIUS_ENTRY_ID]: [1] },
  },
  // A second inverter behind a gateway that is not answering
  {
    endpoint: ["tcp", "modbus-gateway.local", 502],
    connected: false,
    source: "config_entry",
    units: { [FRONIUS_ENTRY_ID]: [2] },
  },
  // A YAML hub keeps a link of its own, on a bus a shared connection also uses
  {
    endpoint: ["serial", RS485_PORT],
    connected: true,
    source: "yaml",
    units: { modbus_hub: [10, 11] },
  },
];

export const mockModbus = (hass: MockHomeAssistant) => {
  hass.mockWS("modbus/connections/list", () => ({ connections: CONNECTIONS }));
};
