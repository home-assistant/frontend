import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSRemoveNodeDialogParams {
  entryId: string;
  deviceId?: string;
  skipConfirmation?: boolean;
  onClose?: () => void;
}

export const loadRemoveNodeDialog = () =>
  import("./dialog-zwave_js-remove-node");

export const showZWaveJSRemoveNodeDialog = (
  element: HTMLElement,
  removeNodeDialogParams: ZWaveJSRemoveNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-remove-node",
    dialogImport: loadRemoveNodeDialog,
    dialogParams: removeNodeDialogParams,
  });
};
