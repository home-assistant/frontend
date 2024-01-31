import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterOpenCommissioningWindowDialogParams {
  device_id: string;
}

export const loadOpenCommissioningWindowDialog = () =>
  import("./dialog-matter-open-commissioning-window");

export const showMatterOpenCommissioningWindowDialog = (
  element: HTMLElement,
  dialogParams: MatterOpenCommissioningWindowDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-open-commissioning-window",
    dialogImport: loadOpenCommissioningWindowDialog,
    dialogParams,
  });
};
