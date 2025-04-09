import type { LocalizeFunc } from "../../common/translations/localize";

import { fireEvent } from "../../common/dom/fire_event";

export const loadCommunityDialog = () => import("./community-dialog");

export const showCommunityDialog = (
  element: HTMLElement,
  params: { localize: LocalizeFunc }
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "community-dialog",
    dialogImport: loadCommunityDialog,
    dialogParams: params,
  });
};
