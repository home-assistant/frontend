import { fireEvent } from "../../../src/common/dom/fire_event";
import "./hassio-repository-editor";

export const showRepositoriesDialog = (element: HTMLElement) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hassio-repository-editor",
    dialogImport: "",
    dialogParams: {},
  });
};
