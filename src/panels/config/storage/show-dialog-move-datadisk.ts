import { fireEvent } from "../../../common/dom/fire_event";
import { HassioHostInfo } from "../../../data/hassio/host";

export interface MoveDatadiskDialogParams {
  hostInfo: HassioHostInfo;
}

export const showMoveDatadiskDialog = (
  element: HTMLElement,
  dialogParams: MoveDatadiskDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-move-datadisk",
    dialogImport: () => import("./dialog-move-datadisk"),
    dialogParams,
  });
};
