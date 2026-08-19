import type { HomeAssistant } from "../types";

export interface SerialPort {
  device: string;
  serial_number: string | null;
  manufacturer: string | null;
  description: string | null;
  interface_description?: string | null;
  interface_num?: number | null;
  vid?: string;
  pid?: string;
  bcd_device?: number | null;
  matching_integrations: string[];
}

export interface SerialPortConsumer {
  kind: "config_entry" | "app";
  title: string;
  active: boolean;
  domain: string | null;
  config_entry_id: string | null;
  slug: string | null;
}

export interface SerialPortDiscoveryFlow {
  flow_id: string;
  domain: string;
}

export interface SerialPortWithConsumers extends SerialPort {
  consumers: SerialPortConsumer[];
  discovery_flows: SerialPortDiscoveryFlow[];
}

export interface MissingSerialPort {
  device: string;
  consumers: SerialPortConsumer[];
}

export interface SerialPortsAndConsumers {
  ports: SerialPortWithConsumers[];
  missing: MissingSerialPort[];
}

export const scanUSBDevices = (hass: HomeAssistant) =>
  hass.callWS({ type: "usb/scan" });

export const listSerialPorts = (hass: HomeAssistant) =>
  hass.callWS<SerialPort[]>({ type: "usb/list_serial_ports" });

export const listSerialPortsWithConsumers = (hass: HomeAssistant) =>
  hass.callWS<SerialPortsAndConsumers>({ type: "usb/serial_ports" });
