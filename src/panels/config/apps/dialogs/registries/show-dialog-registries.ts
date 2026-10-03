import { fireEvent } from "../../../../../common/dom/fire_event";

export interface RegistryDialogParams {
  registryAdded?: () => void;
}

export const showAddRegistryDialog = (
  element: HTMLElement,
  dialogParams: RegistryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-apps-registries",
    dialogImport: () => import("./dialog-registries"),
    dialogParams,
  });
};
