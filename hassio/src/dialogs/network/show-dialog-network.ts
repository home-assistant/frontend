import { fireEvent } from "../../../../src/common/dom/fire_event";
import { NetworkInfo } from "../../../../src/data/hassio/network";
import "./dialog-hassio-network";

export interface HassioNetworkDialogParams {
  network: NetworkInfo;
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
