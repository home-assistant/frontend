import { fireEvent } from "../../../../src/common/dom/fire_event";
import "./dialog-hassio-network";

export interface HassioNetworkDialogParams {
  network: any;
  loadData: () => Promise<void>;
}

export const showNetworkDialog = (
  element: HTMLElement,
  dialogParams: HassioNetworkDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-network",
    dialogImport: () =>
      import(
        /* webpackChunkName: "dialog-hassio-network" */ "./dialog-hassio-network"
      ),
    dialogParams,
  });
};
