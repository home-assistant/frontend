import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { navigate } from "../common/navigate";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../types";
import { subscribeDeviceRegistry } from "./device_registry";

export const canCommissionMatterExternal = (hass: HomeAssistant) =>
  hass.auth.external?.config.canCommissionMatter;

export const startExternalCommissioning = (hass: HomeAssistant) =>
  hass.auth.external?.fireMessage({
    type: "matter/commission",
  });

let CUR_MATTER_DEVICES: Set<string> | undefined;
let UNSUB_DEVICE_REG: UnsubscribeFunc | undefined;

export const redirectOnNewMatterDevice = (hass: HomeAssistant) => {
  if (UNSUB_DEVICE_REG) {
    // we are already redirecting
    return;
  }
  UNSUB_DEVICE_REG = subscribeDeviceRegistry(hass.connection, (entries) => {
    if (!CUR_MATTER_DEVICES) {
      CUR_MATTER_DEVICES = new Set(
        Object.values(entries)
          .filter((device) =>
            device.identifiers.find((identifier) => identifier[0] === "matter")
          )
          .map((device) => device.id)
      );
      return;
    }
    const newMatterDevices = Object.values(entries).filter(
      (device) =>
        device.identifiers.find((identifier) => identifier[0] === "matter") &&
        !CUR_MATTER_DEVICES!.has(device.id)
    );
    if (newMatterDevices.length) {
      stopRedirectOnNewMatterDevice();
      navigate(`/config/devices/device/${newMatterDevices[0].id}`);
    }
  });
};

export const stopRedirectOnNewMatterDevice = () => {
  if (UNSUB_DEVICE_REG) {
    UNSUB_DEVICE_REG();
    UNSUB_DEVICE_REG = undefined;
  }
  CUR_MATTER_DEVICES = undefined;
};

export const addMatterDevice = (element: HTMLElement, hass: HomeAssistant) => {
  if (!canCommissionMatterExternal(hass)) {
    showAlertDialog(element, {
      title: "Use mobile app",
      text: "Matter commissioning is not supported on this device, use the mobile app to commission Matter devices",
    });
    return;
  }
  redirectOnNewMatterDevice(hass);
  // stop redirecting after 10 minutes
  setTimeout(stopRedirectOnNewMatterDevice, 600000);
  startExternalCommissioning(hass);
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
