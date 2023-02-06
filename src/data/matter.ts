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

export const addMatterDevice = (element: HTMLElement, hass: HomeAssistant) => {
  if (canCommissionMatterExternal(hass)) {
    let curMatterDevices: Set<string>;
    let timeout: number | undefined;
    let unsub: UnsubscribeFunc | undefined = subscribeDeviceRegistry(
      hass.connection,
      (entries) => {
        if (!curMatterDevices) {
          curMatterDevices = new Set(
            Object.values(entries)
              .filter((device) =>
                device.identifiers.find(
                  (identifier) => identifier[0] === "matter"
                )
              )
              .map((device) => device.id)
          );
          return;
        }
        const newMatterDevices = Object.values(entries).filter(
          (device) =>
            device.identifiers.find(
              (identifier) => identifier[0] === "matter"
            ) && !curMatterDevices!.has(device.id)
        );
        if (newMatterDevices.length) {
          if (unsub) {
            unsub();
            unsub = undefined;
          }
          if (timeout) {
            clearTimeout(timeout);
          }
          navigate(`/config/devices/device/${newMatterDevices[0].id}`);
        }
      }
    );
    // timeout of 10 minutes
    timeout = window.setTimeout(() => {
      if (unsub) {
        unsub();
        unsub = undefined;
      }
      timeout = undefined;
    }, 600000);
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
