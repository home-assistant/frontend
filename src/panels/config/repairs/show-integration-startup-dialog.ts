import { fireEvent } from "../../../common/dom/fire_event";

export const loadIntegrationStartupDialog = () =>
  import("./dialog-integration-startup");

export const showIntegrationStartupDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-integration-startup",
    dialogImport: loadIntegrationStartupDialog,
    dialogParams: {},
  });
};
