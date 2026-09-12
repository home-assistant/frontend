import type { HomeAssistant } from "../types";

/** Transport with host and port, or with the serial device path. */
export type ModbusEndpoint = [string, string, number] | [string, string];

export interface ModbusConnection {
  endpoint: ModbusEndpoint;
  connected: boolean;
  /** The unit IDs each config entry holds, keyed by config entry ID. */
  units: Record<string, number[]>;
}

export const listModbusConnections = async (
  hass: HomeAssistant
): Promise<ModbusConnection[]> =>
  (
    await hass.callWS<{ connections: ModbusConnection[] }>({
      type: "modbus/connections/list",
    })
  ).connections;

/** The serial port a connection runs over, if it is not a network connection. */
export const modbusSerialDevice = (
  endpoint: ModbusEndpoint
): string | undefined => (endpoint[0] === "serial" ? endpoint[1] : undefined);

/** The address of the device, as `host:port` or as a device path. */
export const modbusEndpointTarget = (endpoint: ModbusEndpoint): string =>
  endpoint.length === 3 ? `${endpoint[1]}:${endpoint[2]}` : endpoint[1];

export const modbusUnitCount = (connection: ModbusConnection): number =>
  Object.values(connection.units).reduce((total, ids) => total + ids.length, 0);
