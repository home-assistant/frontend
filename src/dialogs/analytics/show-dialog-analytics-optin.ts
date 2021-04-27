import { fireEvent } from "../../common/dom/fire_event";
import { Analytics } from "../../data/analytics";

export interface DialogAnalyticsOptInParams {
  analytics: Analytics;
}

export const loadConfigEntrySystemOptionsDialog = () =>
  import("./dialog-analytics-optin");

export const showDialogAnalyticsOptIn = (
  element: HTMLElement,
  dialogParams: DialogAnalyticsOptInParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-analytics-optin",
    dialogImport: loadConfigEntrySystemOptionsDialog,
    dialogParams,
  });
};
