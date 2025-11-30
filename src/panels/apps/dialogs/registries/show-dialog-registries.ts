import { fireEvent } from "../../../../common/dom/fire_event";
import type { Supervisor } from "../../../../data/supervisor/supervisor";
import "./dialog-registries";

export interface RegistriesDialogParams {
  supervisor: Supervisor;
}

export const showRegistriesDialog = (
  element: HTMLElement,
  dialogParams: RegistriesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-apps-registries",
    dialogImport: () => import("./dialog-registries"),
    dialogParams,
  });
};
