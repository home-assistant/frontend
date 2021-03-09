import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import "./dialog-hassio-system-checks";

export interface SystemChecksParams {
  supervisor: Supervisor;
}

export const showSystemChecksDialog = (
  element: HTMLElement,
  dialogParams: SystemChecksParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-system-checks",
    dialogImport: () => import("./dialog-hassio-system-checks"),
    dialogParams,
  });
};
