import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioCreateSnapshotDialogParams {
  supervisor: Supervisor;
  onCreate: () => void;
}

export const showHassioCreateSnapshotDialog = (
  element: HTMLElement,
  dialogParams: HassioCreateSnapshotDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-create-snapshot",
    dialogImport: () => import("./dialog-hassio-create-snapshot"),
    dialogParams,
  });
};
