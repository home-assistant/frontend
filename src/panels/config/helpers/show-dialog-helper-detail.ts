import { fireEvent } from "../../../common/dom/fire_event";
import type { HelperFormItem } from "./const";

export const loadHelperDetailDialog = () => import("./dialog-helper-detail");

export interface ShowDialogHelperDetailParams {
  domain?: string;
  item?: HelperFormItem;
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
