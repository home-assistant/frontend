import { HomeAssistant } from "../types";

export const commissionMatterDevice = (
  hass: HomeAssistant,
  code: string
): Promise<void> =>
  hass.callWS({
    type: "matter/commission",
    code,
  });

export const acceptSharedMatterDevice = (
  hass: HomeAssistant,
  pin: number
): Promise<void> =>
  hass.callWS({
    type: "matter/commission_on_network",
    pin,
  });

export const matterSetWifi = (
  hass: HomeAssistant,
  network_name: string,
  password: string
): Promise<void> =>
  hass.callWS({
    type: "matter/set_wifi_credentials",
    network_name,
    password,
  });

export const matterSetThread = (
  hass: HomeAssistant,
  thread_operation_dataset: string
): Promise<void> =>
  hass.callWS({
    type: "matter/set_thread",
    thread_operation_dataset,
  });
