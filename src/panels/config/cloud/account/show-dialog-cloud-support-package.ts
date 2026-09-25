import { fireEvent } from "../../../../common/dom/fire_event";

export const loadSupportPackageDialog = () =>
  import("./dialog-cloud-support-package");

export const showSupportPackageDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-cloud-support-package",
    dialogImport: loadSupportPackageDialog,
    dialogParams: {},
  });
};
