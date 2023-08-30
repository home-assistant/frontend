import { fireEvent } from "../../common/dom/fire_event";
import { LocalizeFunc } from "../../common/translations/localize";

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
