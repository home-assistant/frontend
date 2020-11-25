import { HomeAssistant } from "../types";

export const removeCastDeviceEntry = (
  hass: HomeAssistant,
  deviceId: string
): Promise<void> =>
  hass.callWS({
    type: "cast/device/remove",
    device_id: deviceId,
  });
