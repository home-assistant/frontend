import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSReinterviewNodeDialogParams {
  device_id: string;
}

export const loadReinterviewNodeDialog = () =>
  import("./dialog-zwave_js-reinterview-node");

export const showZWaveJSReinterviewNodeDialog = (
  element: HTMLElement,
  reinterviewNodeDialogParams: ZWaveJSReinterviewNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-reinterview-node",
    dialogImport: loadReinterviewNodeDialog,
    dialogParams: reinterviewNodeDialogParams,
  });
};
