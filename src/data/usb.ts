import { HomeAssistant } from "../types";

export const scanUSBDevices = (hass: HomeAssistant) =>
  hass.callWS({ type: "usb/scan" });
