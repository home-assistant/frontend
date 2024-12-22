import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import "./dialog-hassio-network";

export interface HassioNetworkDialogParams {
  supervisor: Supervisor;
  loadData: () => Promise<void>;
}

export const showNetworkDialog = (
  element: HTMLElement,
  dialogParams: HassioNetworkDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-network",
    dialogImport: () => import("./dialog-hassio-network"),
    dialogParams,
  });
};
