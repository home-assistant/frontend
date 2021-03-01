import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface SupervisorDialogSupervisorAddonUpdateParams {
  addon: HassioAddonDetails;
  supervisor: Supervisor;
}

export const showDialogSupervisorAddonUpdate = (
  element: HTMLElement,
  dialogParams: SupervisorDialogSupervisorAddonUpdateParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-supervisor-addon-update",
    dialogImport: () => import("./dialog-supervisor-addon-update"),
    dialogParams,
  });
};
