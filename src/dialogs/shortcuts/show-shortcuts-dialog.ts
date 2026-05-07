import type { LitElement } from "lit";
import { fireEvent } from "../../common/dom/fire_event";

export const showShortcutsDialog = (element: LitElement) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-shortcuts",
    dialogImport: () => import("./dialog-shortcuts"),
  });
