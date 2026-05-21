import { fireEvent } from "../../../common/dom/fire_event";

export interface AreaAddToDialogParams {
  areaId: string;
  entityIds: string[];
}

export const loadAreaAddToDialog = () => import("./dialog-area-add-to");

export const showAreaAddToDialog = (
  element: HTMLElement,
  params: AreaAddToDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-area-add-to",
    dialogImport: loadAreaAddToDialog,
    dialogParams: params,
  });
};
