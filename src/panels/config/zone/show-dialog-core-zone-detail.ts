import { fireEvent } from "../../../common/dom/fire_event";

export const loadCoreZoneDetailDialog = () =>
  import("./dialog-core-zone-detail");

export const showCoreZoneDetailDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-core-zone-detail",
    dialogImport: loadCoreZoneDetailDialog,
    dialogParams: {},
  });
};
