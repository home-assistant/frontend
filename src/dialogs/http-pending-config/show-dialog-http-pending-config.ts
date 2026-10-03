import { fireEvent } from "../../common/dom/fire_event";
import type { HttpConfigState } from "../../data/http";

export interface HttpPendingConfigDialogParams {
  state: HttpConfigState;
  onResolved?: () => void;
}

export const loadHttpPendingConfigDialog = () =>
  import("./dialog-http-pending-config");

export const showHttpPendingConfigDialog = (
  element: HTMLElement,
  dialogParams: HttpPendingConfigDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-http-pending-config",
    dialogImport: loadHttpPendingConfigDialog,
    dialogParams,
    addHistory: false,
  });
};
