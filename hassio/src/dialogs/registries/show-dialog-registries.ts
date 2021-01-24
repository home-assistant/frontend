import { fireEvent } from "../../../../src/common/dom/fire_event";
import "./dialog-hassio-registries";

export const showRegistriesDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-registries",
    dialogImport: () => import("./dialog-hassio-registries"),
    dialogParams: {},
  });
};
