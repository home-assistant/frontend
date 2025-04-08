import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterNodeBindingDialogParams {
  device_id: string;
}

export const loadMatterNodeBindingDialog = () =>
  import("./dialog-matter-node-binding");

export const showMatterNodeBindingDialog = (
  element: HTMLElement,
  nodeBindingDialogParams: MatterNodeBindingDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-node-binding",
    dialogImport: loadMatterNodeBindingDialog,
    dialogParams: nodeBindingDialogParams,
  });
};
