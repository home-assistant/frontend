import { fireEvent } from "../../../common/dom/fire_event";
import type { HomeFrontendSystemData } from "../../../data/frontend";

export interface EditHomeDialogParams {
  config: HomeFrontendSystemData;
  saveConfig: (config: HomeFrontendSystemData) => Promise<void>;
}

export const loadEditHomeDialog = () => import("./dialog-edit-home");

export const showEditHomeDialog = (
  element: HTMLElement,
  params: EditHomeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-home",
    dialogImport: loadEditHomeDialog,
    dialogParams: params,
  });
};
