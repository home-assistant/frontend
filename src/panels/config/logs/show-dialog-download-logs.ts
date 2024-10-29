import { fireEvent } from "../../../common/dom/fire_event";

export interface DownloadLogsDialogParams {
  header?: string;
  provider: string;
  defaultLineCount?: number;
  boot: number;
}

export const showDownloadLogsDialog = (
  element: HTMLElement,
  dialogParams: DownloadLogsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-download-logs",
    dialogImport: () => import("./dialog-download-logs"),
    dialogParams,
  });
};
