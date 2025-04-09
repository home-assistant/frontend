import "./dialog-join-beta";

import { fireEvent } from "../../../../common/dom/fire_event";

export interface JoinBetaDialogParams {
  join?: () => any;
  cancel?: () => any;
}

export const showJoinBetaDialog = (
  element: HTMLElement,
  dialogParams: JoinBetaDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-join-beta",
    dialogImport: () => import("./dialog-join-beta"),
    dialogParams,
  });
};
