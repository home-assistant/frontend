import { fireEvent } from "../../common/dom/fire_event";

export interface LongLivedAccessTokenDialogParams {
  token: string;
  name: string;
}

export const showLongLivedAccessTokenDialog = (
  element: HTMLElement,
  longLivedAccessTokenDialogParams: LongLivedAccessTokenDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-long-lived-access-token-dialog",
    dialogImport: () => import("./ha-long-lived-access-token-dialog"),
    dialogParams: longLivedAccessTokenDialogParams,
  });
};
