import { fireEvent } from "../../../common/dom/fire_event";

export const loadHelperDetailDialog = () => import("./dialog-helper-detail");

export interface ShowDialogHelperDetailParams {
  domains?: string[];
  // Only used for config entries
  dialogClosedCallback?: (params: {
    flowFinished: boolean;
    entryId?: string;
    entityId?: string;
  }) => void;
}

export const showHelperDetailDialog = (
  element: HTMLElement,
  params: ShowDialogHelperDetailParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-helper-detail",
    dialogImport: loadHelperDetailDialog,
    dialogParams: params,
  });
};
