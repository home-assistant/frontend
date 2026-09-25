import { fireEvent } from "../../../../../common/dom/fire_event";
import type { ZHAGroup } from "../../../../../data/zha";

export interface ZHAAddGroupMembersDialogParams {
  groupId: number;
  groupName: string;
  devicesAddedCallback: (group: ZHAGroup) => void;
}

export const loadZHAAddGroupMembersDialog = () =>
  import("./dialog-zha-add-group-members");

export const showZHAAddGroupMembersDialog = (
  element: HTMLElement,
  params: ZHAAddGroupMembersDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-add-group-members",
    dialogImport: loadZHAAddGroupMembersDialog,
    dialogParams: params,
  });
};
