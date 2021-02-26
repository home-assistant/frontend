import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioAddonDetails } from "../../../../src/data/hassio/addon";

export interface SupervisorDialogSupervisorAddonUpdateParams {
  addon: HassioAddonDetails;
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
