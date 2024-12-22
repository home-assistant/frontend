import { fireEvent } from "../../common/dom/fire_event";
import { MediaPlayerItem } from "../../data/media-player";

export interface MediaManageDialogParams {
  currentItem: MediaPlayerItem;
  onClose?: () => void;
}

export const showMediaManageDialog = (
  element: HTMLElement,
  dialogParams: MediaManageDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-media-manage",
    dialogImport: () => import("./dialog-media-manage"),
    dialogParams,
  });
};
