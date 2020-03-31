import { fireEvent } from "../../common/dom/fire_event";

export interface MQTTDeviceDebugInfoDialogParams {
  deviceId: string;
}

export const loadMQTTDeviceDebugInfoDialog = () =>
  import(
    /* webpackChunkName: "dialog-mqtt-device-debug-info" */ "./dialog-mqtt-device-debug-info"
  );

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
