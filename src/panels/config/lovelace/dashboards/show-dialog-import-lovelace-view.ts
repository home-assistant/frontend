import { fireEvent } from "../../../../common/dom/fire_event";

export interface ImportLovelaceViewDialogParams {
  url: string;
}

export const showImportLovelaceViewDialog = (
  element: HTMLElement,
  dialogParams: ImportLovelaceViewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-import-lovelace-view",
    dialogImport: () => import("./dialog-import-lovelace-view"),
    dialogParams,
  });
};
