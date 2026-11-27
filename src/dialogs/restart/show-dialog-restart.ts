import { fireEvent } from "../../common/dom/fire_event";
import type { ManagerState } from "../../data/backup_manager";

export interface RestartDialogParams {}

export const loadRestartDialog = () => import("./dialog-restart");
export const loadRestartWaitDialog = () => import("./dialog-restart-wait");

export const showRestartDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-restart",
    dialogImport: loadRestartDialog,
    dialogParams: {},
  });
};

export interface RestartWaitDialogParams {
  title: string;
  initialBackupState: ManagerState;
  action: () => Promise<void>;
}

export const showRestartWaitDialog = (
  element: HTMLElement,
  dialogParams: RestartWaitDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-restart-wait",
    dialogImport: loadRestartWaitDialog,
    dialogParams,
  });
};
