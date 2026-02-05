import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { HomeAssistant } from "../../types";

export const loadAppDialog = () => import("./app-dialog");

export const showAppDialog = (
  element: HTMLElement,
  params: { localize: LocalizeFunc; hass: HomeAssistant }
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "app-dialog",
    dialogImport: loadAppDialog,
    dialogParams: params,
  });
};
