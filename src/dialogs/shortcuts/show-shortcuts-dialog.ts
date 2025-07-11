import { fireEvent } from "../../common/dom/fire_event";

export const showShortcutsDialog = (element: HTMLElement) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-shortcuts",
    dialogImport: () => import("./dialog-shortcuts"),
    dialogParams: {},
  });
