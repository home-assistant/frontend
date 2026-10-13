import type { HassServiceTarget } from "home-assistant-js-websocket";

export const getDeviceTarget = (
  deviceId?: string
): HassServiceTarget | undefined =>
  deviceId ? { device_id: [deviceId] } : undefined;
