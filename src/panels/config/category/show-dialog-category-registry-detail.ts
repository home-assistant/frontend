import { fireEvent } from "../../../common/dom/fire_event";
import { CategoryRegistryEntry } from "../../../data/category_registry";

export interface CategoryRegistryDetailDialogParams {
  entry?: CategoryRegistryEntry;
  scope: string;
}

export const loadCategoryRegistryDetailDialog = () =>
  import("./dialog-category-registry-detail");

export const showCategoryRegistryDetailDialog = (
  element: HTMLElement,
  dialogParams: CategoryRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-category-registry-detail",
    dialogImport: loadCategoryRegistryDetailDialog,
    dialogParams,
  });
};
