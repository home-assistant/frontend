import { fireEvent } from "../../../../common/dom/fire_event";

export const loadNewBlueprintDialog = () => import("./dialog-new-blueprint");

export const showAddBlueprintDialog = (
  element: HTMLElement,
  dialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-new-blueprint",
    dialogImport: loadNewBlueprintDialog,
    dialogParams,
  });
};
