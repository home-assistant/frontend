import { fireEvent } from "../../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";

export interface MQTTDeviceDebugInfoDialogParams {
  device: DeviceRegistryEntry;
}

export const loadMQTTDeviceDebugInfoDialog = () =>
  import("./dialog-mqtt-device-debug-info");

export const showMQTTDeviceDebugInfoDialog = (
  element: HTMLElement,
  mqttDeviceInfoParams: MQTTDeviceDebugInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-mqtt-device-debug-info",
    dialogImport: loadMQTTDeviceDebugInfoDialog,
    dialogParams: mqttDeviceInfoParams,
  });
};
