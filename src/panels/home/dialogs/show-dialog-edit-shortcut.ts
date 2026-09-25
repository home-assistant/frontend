import { fireEvent } from "../../../common/dom/fire_event";
import type { CustomShortcutItem } from "../../../data/home_shortcuts";

export interface EditShortcutDialogParams {
  item: CustomShortcutItem;
  saveCallback: (item: CustomShortcutItem) => void;
}

export const loadEditShortcutDialog = () => import("./dialog-edit-shortcut");

export const showEditShortcutDialog = (
  element: HTMLElement,
  params: EditShortcutDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-shortcut",
    dialogImport: loadEditShortcutDialog,
    dialogParams: params,
  });
};
