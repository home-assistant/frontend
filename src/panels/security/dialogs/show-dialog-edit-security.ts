import { fireEvent } from "../../../common/dom/fire_event";
import type { SecurityFrontendSystemData } from "../../../data/frontend";

export interface EditSecurityDialogParams {
  config: SecurityFrontendSystemData;
  saveConfig: (config: SecurityFrontendSystemData) => Promise<void>;
}

export const loadEditSecurityDialog = () => import("./dialog-edit-security");

export const showEditSecurityDialog = (
  element: HTMLElement,
  params: EditSecurityDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-security",
    dialogImport: loadEditSecurityDialog,
    dialogParams: params,
  });
};
