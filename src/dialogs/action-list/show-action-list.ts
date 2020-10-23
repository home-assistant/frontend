import { fireEvent } from "../../common/dom/fire_event";
import { ActionConfig } from "../../data/lovelace";

export interface HaActionListDialogParams {
  actions: ActionConfig[];
  entity?: string;
  name?: string;
}

export const loadActionListDialog = () =>
  import(/* webpackChunkName: "dialog-action-list" */ "./action-list");

export const showActionListDialog = (
  element: HTMLElement,
  dialogParams: HaActionListDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-action-list",
    dialogImport: loadActionListDialog,
    dialogParams,
  });
};
