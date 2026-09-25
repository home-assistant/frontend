import { fireEvent } from "../../common/dom/fire_event";

interface ListItem {
  icon?: string;
  iconPath?: string;
  label: string;
  description?: string;
  action: () => any;
}

export interface ListItemsDialogParams {
  title?: string;
  items: ListItem[];
  mode?: "dialog" | "bottom-sheet";
}

export const showListItemsDialog = (
  element: HTMLElement,
  params: ListItemsDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-list-items",
    dialogImport: () => import("./dialog-list-items"),
    dialogParams: params,
  });
