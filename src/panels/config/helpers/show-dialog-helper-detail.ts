import { fireEvent } from "../../../common/dom/fire_event";

export const loadHelperDetailDialog = () =>
  import(
    /* webpackChunkName: "helper-detail-dialog" */ "./dialog-helper-detail"
  );

export const showHelperDetailDialog = (element: HTMLElement) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-helper-detail",
    dialogImport: loadHelperDetailDialog,
    dialogParams: {},
  });
};
