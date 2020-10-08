import { fireEvent } from "../../common/dom/fire_event";

export interface QuickOpenDialogParams {
  entityFilter?: string;
  commandMode?: boolean;
}

export const loadQuickOpenDialog = () =>
  import(/* webpackChunkName: "quick-open-dialog" */ "./ha-quick-open-dialog");

export const showQuickOpenDialog = (
  element: HTMLElement,
  dialogParams: QuickOpenDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-quick-open-dialog",
    dialogImport: loadQuickOpenDialog,
    dialogParams,
  });
};
