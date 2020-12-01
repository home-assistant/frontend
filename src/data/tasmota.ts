import { HomeAssistant } from "../types";

export interface TasmotaDevice {
  ip: string;
  mac: string;
  manufacturer: string;
  model: string;
  name: string;
  rssi?: string;
  sw_version: string;
}

export const fetchTasmotaDevice = (
  hass: HomeAssistant,
  deviceId: string
): Promise<TasmotaDevice> =>
  hass.callWS({
    type: "tasmota/device",
    device_id: deviceId,
  });

export const removeTasmotaDeviceEntry = (
  hass: HomeAssistant,
  deviceId: string
): Promise<void> =>
  hass.callWS({
    type: "tasmota/device/remove",
    device_id: deviceId,
  });
