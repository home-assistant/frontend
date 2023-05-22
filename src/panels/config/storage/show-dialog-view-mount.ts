import { fireEvent } from "../../../common/dom/fire_event";
import { SupervisorMount } from "../../../data/supervisor/mounts";

export interface MountViewDialogParams {
  mount?: SupervisorMount;
  defaultBackupMount: string | null;
  reloadMounts: () => void;
}

export const showMountViewDialog = (
  element: HTMLElement,
  dialogParams: MountViewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-mount-view",
    dialogImport: () => import("./dialog-mount-view"),
    dialogParams,
  });
};
