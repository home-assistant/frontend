import type { CallWS, HomeAssistant } from "../types";

export interface ESPHomeEncryptionKey {
  encryption_key: string | null;
}

export type ESPHomeSerialPortType = "TTL" | "RS232" | "RS485" | "USB_SERIAL";

export interface ESPHomeBluetoothProxyCapabilities {
  supported: boolean;
}

export interface ESPHomeZWaveProxyCapabilities {
  supported: boolean;
  home_id: number;
  config_entry_id: string | null;
}

export interface ESPHomeSerialProxy {
  name: string;
  port_type: ESPHomeSerialPortType | null;
  url: string;
}

export interface ESPHomeDeviceCapabilities {
  bluetooth_proxy: ESPHomeBluetoothProxyCapabilities;
  zwave_proxy: ESPHomeZWaveProxyCapabilities;
  serial_proxies: ESPHomeSerialProxy[];
}

export const fetchESPHomeEncryptionKey = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ESPHomeEncryptionKey> =>
  hass.callWS({
    type: "esphome/get_encryption_key",
    entry_id,
  });

export const fetchESPHomeDeviceCapabilities = (
  hass: { callWS: CallWS },
  deviceId: string
): Promise<ESPHomeDeviceCapabilities> =>
  hass.callWS({
    type: "esphome/get_device_capabilities",
    device_id: deviceId,
  });
