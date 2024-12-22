import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import "./dialog-hassio-registries";

export interface RegistriesDialogParams {
  supervisor: Supervisor;
}

export const showRegistriesDialog = (
  element: HTMLElement,
  dialogParams: RegistriesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-registries",
    dialogImport: () => import("./dialog-hassio-registries"),
    dialogParams,
  });
};
