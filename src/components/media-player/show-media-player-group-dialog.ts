import { fireEvent } from "../../common/dom/fire_event";

export interface MediaPlayerGroupDialogParams {
  entityId: string;
}

export const showMediaPlayerGroupDialog = (
  element: HTMLElement,
  dialogParams: MediaPlayerGroupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-media-player-group",
    dialogImport: () => import("./dialog-media-player-group"),
    dialogParams,
  });
};
