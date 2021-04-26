import { fireEvent } from "../../../common/dom/fire_event";

export const loadImportBlueprintDialog = () =>
  import("./dialog-import-blueprint");

export const showAddBlueprintDialog = (
  element: HTMLElement,
  dialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-import-blueprint",
    dialogImport: loadImportBlueprintDialog,
    dialogParams,
  });
};
