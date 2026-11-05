import { fireEvent } from "../../../common/dom/fire_event";

export const loadUpdateReportDialog = () => import("./dialog-update-report");

export const showUpdateReportDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-update-report",
    dialogImport: loadUpdateReportDialog,
    dialogParams: {},
  });
};
