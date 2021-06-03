import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import { HassioSnapshot } from "../../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioAddonRestoreDialogParams {
  supervisor: Supervisor;
  snapshots: HassioSnapshot[];
  addon: HassioAddonDetails;
  onRestore: () => void;
}

export const showHassioAddonRestoreDialog = (
  element: HTMLElement,
  dialogParams: HassioAddonRestoreDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-addon-restore",
    dialogImport: () => import("./dialog-hassio-addon-restore"),
    dialogParams,
  });
};
