import { fireEvent } from "../../common/dom/fire_event";

export interface MediaPlayerDialogParams {
  sourceUrl: string;
  sourceType: string;
  title?: string;
}

export const showMediaPlayerDialog = (
  element: HTMLElement,
  mediaPlayerDialogParams: MediaPlayerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-media-player",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-media-player" */ "./hui-dialog-media-player"
      ),
    dialogParams: mediaPlayerDialogParams,
  });
};
