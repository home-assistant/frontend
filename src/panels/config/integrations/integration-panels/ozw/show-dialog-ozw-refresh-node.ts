import { fireEvent } from "../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";

export interface OZWRefreshNodeDialogParams {
  device: DeviceRegistryEntry;
}

export const loadRefreshNodeDialog = () =>
  import(
    /* webpackChunkName: "dialog-ozw-refresh-node" */ "./dialog-ozw-refresh-node"
  );

export const showOZWRefreshNodeDialog = (
  element: HTMLElement,
  refreshNodeDialogParams: OZWRefreshNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-ozw-refresh-node",
    dialogImport: loadRefreshNodeDialog,
    dialogParams: refreshNodeDialogParams,
  });
};
