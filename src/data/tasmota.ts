import { HomeAssistant } from "../types";

export const removeTasmotaDeviceEntry = (
  hass: HomeAssistant,
  deviceId: string
): Promise<void> =>
  hass.callWS({
    type: "tasmota/device/remove",
    device_id: deviceId,
  });
