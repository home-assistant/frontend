import { fireEvent } from "../../../../../../common/dom/fire_event";

export interface ZWaveJSAddNodeDialogParams {
  entry_id: string;
  longRangeSupported?: boolean;
  inclusionOngoing?: boolean;
  dsk?: string;
  onStop?: () => void;
}

export const loadAddNodeDialog = () => import("./dialog-zwave_js-add-node");

export const showZWaveJSAddNodeDialog = (
  element: HTMLElement,
  addNodeDialogParams: ZWaveJSAddNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-add-node",
    dialogImport: loadAddNodeDialog,
    dialogParams: addNodeDialogParams,
  });
};
