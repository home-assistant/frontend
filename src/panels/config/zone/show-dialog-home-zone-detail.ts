import { fireEvent } from "../../../common/dom/fire_event";
import { HomeZoneMutableParams } from "../../../data/zone";

export interface HomeZoneDetailDialogParams {
  updateEntry?: (updates: HomeZoneMutableParams) => Promise<unknown>;
}

export const loadHomeZoneDetailDialog = () =>
  import("./dialog-home-zone-detail");

export const showHomeZoneDetailDialog = (
  element: HTMLElement,
  params: HomeZoneDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-home-zone-detail",
    dialogImport: loadHomeZoneDetailDialog,
    dialogParams: params,
  });
};
