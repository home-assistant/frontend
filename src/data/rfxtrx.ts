import { HomeAssistant } from "../types";

export const removeRfxtrxDeviceEntry = (
  hass: HomeAssistant,
  deviceId: string
): Promise<void> =>
  hass.callWS({
    type: "rfxtrx/device/remove",
    device_id: deviceId,
  });
