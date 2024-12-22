import { fireEvent } from "../../../common/dom/fire_event";
import type { NetworkInterface } from "../../../data/hassio/network";

export interface IPDetailDialogParams {
  interface?: NetworkInterface;
}

export const loadIPDetailDialog = () => import("./dialog-ip-detail");

export const showIPDetailDialog = (
  element: HTMLElement,
  dialogParams: IPDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-ip-detail",
    dialogImport: loadIPDetailDialog,
    dialogParams,
  });
};
