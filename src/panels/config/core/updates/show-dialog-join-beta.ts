import { fireEvent } from "../../../../common/dom/fire_event";
import "./dialog-join-beta";

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
