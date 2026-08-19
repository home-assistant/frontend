import type { HomeAssistant } from "../types";

export interface SerialPort {
  device: string;
  serial_number: string | null;
  manufacturer: string | null;
  description: string | null;
  interface_description?: string | null;
  vid?: string;
  pid?: string;
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

export interface SerialPortWithConsumers extends SerialPort {
  present: boolean;
  consumers: SerialPortConsumer[];
}

export const scanUSBDevices = (hass: HomeAssistant) =>
  hass.callWS({ type: "usb/scan" });

export const listSerialPorts = (hass: HomeAssistant) =>
  hass.callWS<SerialPort[]>({ type: "usb/list_serial_ports" });

export const listSerialPortsWithConsumers = (hass: HomeAssistant) =>
  hass.callWS<SerialPortWithConsumers[]>({ type: "usb/serial_ports" });
