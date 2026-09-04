import type { ModbusConnection } from "../../../src/data/modbus";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { DEMO_RS485_PORT } from "./usb";

const demoModbusConnections: ModbusConnection[] = [
  {
    endpoint: ["serial", DEMO_RS485_PORT],
    connected: true,
    units: { "mock-flexit": [1], "mock-solaredge": [2] },
  },
  {
    endpoint: ["tcp", "192.168.1.42", 502],
    connected: true,
    units: { "mock-fronius": [1] },
  },
  {
    endpoint: ["tcp", "modbus-gateway.local", 502],
    connected: false,
    units: { "mock-fronius": [2] },
  },
];

export const mockModbus = (hass: MockHomeAssistant) => {
  hass.mockWS("modbus/connections/list", () => ({
    connections: demoModbusConnections,
  }));
};
