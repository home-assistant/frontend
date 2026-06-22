import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";

export const loadAppDialog = () => import("./app-dialog");

export interface AppDialogParams {
  localize: LocalizeFunc;
}

export const showAppDialog = (
  element: HTMLElement,
  params: AppDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "app-dialog",
    dialogImport: loadAppDialog,
    dialogParams: params,
    addHistory: false,
  });
};
