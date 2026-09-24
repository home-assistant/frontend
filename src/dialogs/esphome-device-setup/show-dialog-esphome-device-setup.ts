import { fireEvent } from "../../common/dom/fire_event";
import type { ESPHomeDeviceCapabilities } from "../../data/esphome";

export const loadESPHomeDeviceSetupDialog = () =>
  import("./dialog-esphome-device-setup");

export interface ESPHomeDeviceSetupDialogParams {
  deviceId: string;
  deviceName?: string;
  capabilities?: ESPHomeDeviceCapabilities;
  mediaPlayerSupported?: boolean;
  dialogClosedCallback?: () => void;
}

export const showESPHomeDeviceSetupDialog = (
  element: HTMLElement,
  dialogParams: ESPHomeDeviceSetupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-esphome-device-setup",
    dialogImport: loadESPHomeDeviceSetupDialog,
    dialogParams,
  });
};
