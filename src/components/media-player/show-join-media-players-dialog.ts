import { fireEvent } from "../../common/dom/fire_event";

export interface JoinMediaPlayersDialogParams {
  entityId: string;
}

export const showJoinMediaPlayersDialog = (
  element: HTMLElement,
  dialogParams: JoinMediaPlayersDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-join-media-players",
    dialogImport: () => import("./dialog-join-media-players"),
    dialogParams,
  });
};
