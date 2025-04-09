import type { SupervisorMount } from "../../../data/supervisor/mounts";

import { fireEvent } from "../../../common/dom/fire_event";

export interface MountViewDialogParams {
  mount?: SupervisorMount;
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
