import type { HomeAssistant } from "../types";

export interface SerialPort {
  device: string;
  serial_number: string | null;
  manufacturer: string | null;
  description: string | null;
  vid?: string;
  pid?: string;
}

export const scanUSBDevices = (hass: HomeAssistant) =>
  hass.callWS({ type: "usb/scan" });

export const listSerialPorts = (hass: HomeAssistant) =>
  hass.callWS<SerialPort[]>({ type: "usb/list_serial_ports" });
