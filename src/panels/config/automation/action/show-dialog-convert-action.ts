import { fireEvent } from "../../../../common/dom/fire_event";
import type { Action } from "../../../../data/script";

export interface ConvertActionDialogParams {
  currentAction: Action;
  convert: (newAction: Action) => void;
  duplicateConvert: (newAction: Action) => void;
}

const loadDialog = () => import("./dialog-convert-action");

export const showConvertActionDialog = (
  element: HTMLElement,
  dialogParams: ConvertActionDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-convert-action",
    dialogImport: loadDialog,
    dialogParams,
  });
};
