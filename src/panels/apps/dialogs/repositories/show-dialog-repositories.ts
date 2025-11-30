import { fireEvent } from "../../../../common/dom/fire_event";
import type { Supervisor } from "../../../../data/supervisor/supervisor";
import "./dialog-repositories";

export interface RepositoryDialogParams {
  supervisor: Supervisor;
  url?: string;
}

export const showRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: RepositoryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-apps-repositories",
    dialogImport: () => import("./dialog-repositories"),
    dialogParams,
  });
};
