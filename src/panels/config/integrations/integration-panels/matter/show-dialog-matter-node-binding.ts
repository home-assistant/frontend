import { fireEvent } from "../../../../../common/dom/fire_event";
import type { MatterNodeBinding } from "../../../../../data/matter";

export interface MatterNodeBindingDialogParams {
  device_id: string;
  onUpdate: (bindings: Record<string, MatterNodeBinding[]>) => void;
  bindings: Record<string, MatterNodeBinding[]>;
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
