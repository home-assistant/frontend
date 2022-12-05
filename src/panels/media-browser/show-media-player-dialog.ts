import { fireEvent } from "../../common/dom/fire_event";

export interface WebBrowserPlayMediaDialogParams {
  sourceUrl: string;
  sourceType: string;
  title?: string;
  can_play?: boolean;
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
