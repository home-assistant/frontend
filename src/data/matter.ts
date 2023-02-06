import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../types";

export const canCommissionMatterExternal = (hass: HomeAssistant) =>
  hass.auth.external?.config.canCommissionMatter;

export const startExternalCommissioning = (hass: HomeAssistant) =>
  hass.auth.external?.fireMessage({
    type: "matter/commission",
  });

export const addMatterDevice = (element, hass) => {
  if (canCommissionMatterExternal(hass)) {
    startExternalCommissioning(hass);
    return;
  }
  showAlertDialog(element, {
    title: "Use mobile app",
    text: "Matter commissioning is not supported on this device, use the mobile app to commission Matter devices",
  });
};

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
