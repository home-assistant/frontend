import { fireEvent } from "../../../common/dom/fire_event";

export interface LiveLogDialogParams {
  domain: string;
  name: string;
}

export const showLiveLogDialog = (
  element: HTMLElement,
  dialogParams: LiveLogDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-live-log",
    dialogImport: () => import("./dialog-live-log"),
    dialogParams,
  });
};
