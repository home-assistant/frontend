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

export interface ESPHomeWizardEntity {
  /** Null when Home Assistant has no entity for it. */
  entity_id: string | null;
  description: string;
}

export interface ESPHomeWizardPage {
  title: string;
  description: string;
  entities: ESPHomeWizardEntity[];
}

export interface ESPHomeDeviceWizard {
  pages: ESPHomeWizardPage[];
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

export const fetchESPHomeDeviceWizard = (
  hass: { callWS: CallWS },
  deviceId: string
): Promise<ESPHomeDeviceWizard> =>
  hass.callWS({
    type: "esphome/get_device_wizard",
    device_id: deviceId,
  });
