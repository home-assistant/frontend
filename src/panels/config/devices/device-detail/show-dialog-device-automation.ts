import { fireEvent } from "../../../../common/dom/fire_event";

export interface DeviceAutomationDialogParams {
  deviceId: string;
  script?: boolean;
}

export const loadDeviceAutomationDialog = () =>
  import(
    /* webpackChunkName: "device-automation-dialog" */ "./ha-device-automation-dialog"
  );

export const showDeviceAutomationDialog = (
  element: HTMLElement,
  detailParams: DeviceAutomationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-device-automation",
    dialogImport: loadDeviceAutomationDialog,
    dialogParams: detailParams,
  });
};
