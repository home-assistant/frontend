import { fireEvent } from "../../common/dom/fire_event";

export interface MediaPlayerBrowserDialogParams {
  sourceUrl: string;
  sourceType: string;
  title?: string;
}

export const showMediaPlayerBrowserDialog = (
  element: HTMLElement,
  mediaPlayerBrowserDialogParams: MediaPlayerBrowserDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-browser-media-player",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-media-player" */ "./hui-dialog-browser-media-player"
      ),
    dialogParams: mediaPlayerBrowserDialogParams,
  });
};
