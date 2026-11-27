import { fireEvent } from "../../../common/dom/fire_event";

export const showAnalyticsPreviewDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-analytics-preview",
    dialogImport: () => import("./dialog-analytics-preview"),
    dialogParams: {},
  });
};
