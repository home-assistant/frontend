import { fireEvent } from "../../../../../common/dom/fire_event";
import "./dialog-registries";

export const showRegistriesDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-apps-registries",
    dialogImport: () => import("./dialog-registries"),
    dialogParams: {},
  });
};
