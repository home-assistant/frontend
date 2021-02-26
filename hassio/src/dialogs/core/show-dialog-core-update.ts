import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioHomeAssistantInfo } from "../../../../src/data/hassio/supervisor";

export interface SupervisorDialogSupervisorCoreUpdateParams {
  core: HassioHomeAssistantInfo;
}

export const showDialogSupervisorCoreUpdate = (
  element: HTMLElement,
  dialogParams: SupervisorDialogSupervisorCoreUpdateParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-supervisor-core-update",
    dialogImport: () => import("./dialog-supervisor-core-update"),
    dialogParams,
  });
};
