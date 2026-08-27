import type { CallWS, HomeAssistant } from "../types";

export interface SerialPort {
  device: string;
  resolved_device: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  description: string | null;
  interface_description?: string | null;
  interface_num?: number | null;
  vid?: string;
  pid?: string;
  bcd_device?: number | null;
  matching_integrations: string[];
  // Configured ports that are not currently connected are absent from a scan
  present: boolean;
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

export interface SerialPortUsage extends SerialPort {
  consumers: SerialPortConsumer[];
  discovery_flows: SerialPortDiscoveryFlow[];
}

export const scanUSBDevices = (hass: HomeAssistant) =>
  hass.callWS({ type: "usb/scan" });

export const listSerialPorts = (hass: HomeAssistant) =>
  hass.callWS<SerialPort[]>({ type: "usb/list_serial_ports" });

export const listSerialPortsWithUsage = (hass: { callWS: CallWS }) =>
  hass.callWS<SerialPortUsage[]>({
    type: "usb/list_serial_ports",
    include_usage: true,
  });
