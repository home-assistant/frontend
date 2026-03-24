import { fireEvent } from "../../../common/dom/fire_event";
import type { MaintenanceFrontendSystemData } from "../../../data/frontend";

export interface EditMaintenanceDialogParams {
  config: MaintenanceFrontendSystemData;
  saveConfig: (config: MaintenanceFrontendSystemData) => Promise<void>;
}

export const loadEditMaintenanceDialog = () =>
  import("./dialog-edit-maintenance");

export const showEditMaintenanceDialog = (
  element: HTMLElement,
  params: EditMaintenanceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-maintenance",
    dialogImport: loadEditMaintenanceDialog,
    dialogParams: params,
  });
};
