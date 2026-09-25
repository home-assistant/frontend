import type { HomeAssistant } from "../types";

export interface ESPHomeEncryptionKey {
  encryption_key: string;
}

export const fetchESPHomeEncryptionKey = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ESPHomeEncryptionKey> =>
  hass.callWS({
    type: "esphome/get_encryption_key",
    entry_id,
  });
