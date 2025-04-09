import type { LocalizeFunc } from "../../common/translations/localize";

import { fireEvent } from "../../common/dom/fire_event";

export const loadAppDialog = () => import("./app-dialog");

export const showAppDialog = (
  element: HTMLElement,
  params: { localize: LocalizeFunc }
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "app-dialog",
    dialogImport: loadAppDialog,
    dialogParams: params,
  });
};
