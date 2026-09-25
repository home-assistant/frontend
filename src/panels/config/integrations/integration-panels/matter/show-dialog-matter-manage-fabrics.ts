import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterManageFabricsDialogParams {
  device_id: string;
}

export const loadManageFabricsDialog = () =>
  import("./dialog-matter-manage-fabrics");

export const showMatterManageFabricsDialog = (
  element: HTMLElement,
  dialogParams: MatterManageFabricsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-manage-fabrics",
    dialogImport: loadManageFabricsDialog,
    dialogParams,
  });
};
