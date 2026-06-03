import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";

export const loadCommunityDialog = () => import("./community-dialog");

export interface CommunityDialogParams {
  localize: LocalizeFunc;
}

export const showCommunityDialog = (
  element: HTMLElement,
  params: CommunityDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "community-dialog",
    dialogImport: loadCommunityDialog,
    dialogParams: params,
    addHistory: false,
  });
};
