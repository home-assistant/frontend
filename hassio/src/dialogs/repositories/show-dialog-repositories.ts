import { fireEvent } from "../../../../src/common/dom/fire_event";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import "./dialog-hassio-repositories";

export interface HassioRepositoryDialogParams {
  supervisor: Supervisor;
  url?: string;
}

export const showRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: HassioRepositoryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-repositories",
    dialogImport: () => import("./dialog-hassio-repositories"),
    dialogParams,
  });
};
