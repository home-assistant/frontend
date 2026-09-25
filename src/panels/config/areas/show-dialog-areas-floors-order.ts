import { fireEvent } from "../../../common/dom/fire_event";

export interface AreasFloorsOrderDialogParams {}

export const loadAreasFloorsOrderDialog = () =>
  import("./dialog-areas-floors-order");

export const showAreasFloorsOrderDialog = (
  element: HTMLElement,
  params: AreasFloorsOrderDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-areas-floors-order",
    dialogImport: loadAreasFloorsOrderDialog,
    dialogParams: params,
  });
};
