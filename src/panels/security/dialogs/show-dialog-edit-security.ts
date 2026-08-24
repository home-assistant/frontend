import { fireEvent } from "../../../common/dom/fire_event";
import type { SecurityFrontendSystemData } from "../../../data/frontend";
import type { HomeAssistant } from "../../../types";

export interface EditSecurityDialogParams {
  hass: HomeAssistant;
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
