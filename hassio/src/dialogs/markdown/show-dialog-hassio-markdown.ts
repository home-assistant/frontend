import { fireEvent } from "../../../../src/common/dom/fire_event";

export interface HassioMarkdownDialogParams {
  title: string;
  content: string;
}

export const showHassioMarkdownDialog = (
  element: HTMLElement,
  dialogParams: HassioMarkdownDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-markdown",
    dialogImport: () =>
      import(
        /* webpackChunkName: "dialog-hassio-markdown" */ "./dialog-hassio-markdown"
      ),
    dialogParams,
  });
};
