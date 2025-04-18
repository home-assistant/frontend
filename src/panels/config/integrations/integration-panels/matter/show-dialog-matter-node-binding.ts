import { fireEvent } from "../../../../../common/dom/fire_event";
import type { MatterNodeBinding } from "../../../../../data/matter";
import type { MatterDeviceMapper } from "./matter-binding-node-device-mapper";

export interface MatterNodeBindingDialogParams {
  device_id: string;
  onUpdate: (
    source_endpoint: number,
    bindings: Record<string, MatterNodeBinding[]>
  ) => void;
  bindings: Record<string, MatterNodeBinding[]>;
  deviceMapper: MatterDeviceMapper;
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
