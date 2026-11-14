import { fireEvent } from "../../common/dom/fire_event";
import type { MediaPlayerItem } from "../../data/media-player";

export interface WebBrowserPlayMediaDialogParams {
  sourceUrl: string;
  sourceType: string;
  title?: string;
  can_play?: boolean;
  // The pictures of the folder, to step through them from the dialog
  images?: MediaPlayerItem[];
  imageIndex?: number;
}

export const showWebBrowserPlayMediaDialog = (
  element: HTMLElement,
  webBrowserPlayMediaDialogParams: WebBrowserPlayMediaDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-web-browser-play-media",
    dialogImport: () => import("./hui-dialog-web-browser-play-media"),
    dialogParams: webBrowserPlayMediaDialogParams,
  });
};
