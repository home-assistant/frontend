import { fireEvent } from "../../../../../common/dom/fire_event";
import { ZHADevice } from "../../../../../data/zha";

export interface ZHAClusterDialogParams {
  device: ZHADevice;
}

export const loadZHAClusterDialog = () => import("./dialog-zha-cluster");

export const showZHAClusterDialog = (
  element: HTMLElement,
  params: ZHAClusterDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-cluster",
    dialogImport: loadZHAClusterDialog,
    dialogParams: params,
  });
};
