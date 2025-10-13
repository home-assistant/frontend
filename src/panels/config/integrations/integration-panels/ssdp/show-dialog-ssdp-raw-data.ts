import { fireEvent } from "../../../../../common/dom/fire_event";

export interface SSDPRawDataDialogParams {
  key: string;
  data: Record<string, unknown>;
}

export const loadSSDPRawDataDialog = () => import("./dialog-ssdp-raw-data");

export const showSSDPRawDataDialog = (
  element: HTMLElement,
  ssdpRawDataDialogParams: SSDPRawDataDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-ssdp-raw-data",
    dialogImport: loadSSDPRawDataDialog,
    dialogParams: ssdpRawDataDialogParams,
  });
};
