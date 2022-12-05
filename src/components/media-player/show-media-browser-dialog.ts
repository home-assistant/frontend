import { fireEvent } from "../../common/dom/fire_event";
import {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
} from "../../data/media-player";
import { MediaPlayerItemId } from "./ha-media-player-browse";

export interface MediaPlayerBrowseDialogParams {
  action: MediaPlayerBrowseAction;
  entityId: string;
  mediaPickedCallback: (pickedMedia: MediaPickedEvent) => void;
  navigateIds?: MediaPlayerItemId[];
}

export const showMediaBrowserDialog = (
  element: HTMLElement,
  dialogParams: MediaPlayerBrowseDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-media-player-browse",
    dialogImport: () => import("./dialog-media-player-browse"),
    dialogParams,
  });
};
