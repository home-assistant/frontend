import { fireEvent } from "../../../common/dom/fire_event";
import { EntityRegistryEntry } from "../../../data/entity_registry";

export interface AssignCategoryDialogParams {
  entityReg: EntityRegistryEntry;
  scope: string;
}

export const loadAssignCategoryDialog = () =>
  import("./dialog-assign-category");

export const showAssignCategoryDialog = (
  element: HTMLElement,
  dialogParams: AssignCategoryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-assign-category",
    dialogImport: loadAssignCategoryDialog,
    dialogParams,
  });
};
