import type { Connection } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

export interface LoRaWANReception {
  gateway_id: string;
  rssi: number | null;
  snr: number | null;
}

export interface LoRaWANConnection {
  entry_id: string;
  domain: string;
  title: string;
  configuration_url: string | null;
}

export interface LoRaWANDevice {
  dev_eui: string;
  name: string;
  manufacturer: string;
  model: string;
  application_id: string;
  device_id: string | null;
  connection: LoRaWANConnection;
  support:
    | "supported"
    | "missing_identity"
    | "integration_not_configured"
    | "unsupported_model";
  last_uplink: string | null;
  last_join: string | null;
  last_status: string | null;
  receptions: LoRaWANReception[];
  battery_level: number | null;
  external_power_source: boolean | null;
  downlink_margin: number | null;
}

export interface LoRaWANDevices {
  devices: LoRaWANDevice[];
  connections: LoRaWANConnection[];
}

export const fetchLoRaWANDevices = (hass: HomeAssistant) =>
  hass.callWS<LoRaWANDevices>({ type: "lorawan/devices/list" });

export const subscribeLoRaWANDevices = (
  connection: Connection,
  listener: (snapshot: LoRaWANDevices) => void
) =>
  connection.subscribeMessage<LoRaWANDevices>(listener, {
    type: "lorawan/devices/subscribe",
  });

export const strongestLoRaWANReception = (receptions: LoRaWANReception[]) =>
  receptions.reduce<LoRaWANReception | undefined>(
    (strongest, reception) =>
      reception.rssi !== null &&
      (strongest?.rssi == null || reception.rssi > strongest.rssi)
        ? reception
        : strongest,
    undefined
  );
