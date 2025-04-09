import type {
  MediaPickedEvent,
  MediaPlayerBrowseAction,
} from "../../data/media-player";
import type { MediaPlayerItemId } from "./ha-media-player-browse";

import { fireEvent } from "../../common/dom/fire_event";

export interface MediaPlayerBrowseDialogParams {
  action: MediaPlayerBrowseAction;
  entityId: string;
  mediaPickedCallback: (pickedMedia: MediaPickedEvent) => void;
  navigateIds?: MediaPlayerItemId[];
  minimumNavigateLevel?: number;
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
