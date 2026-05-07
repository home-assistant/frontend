import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterLockManageDialogParams {
  entity_id: string;
}

export const loadMatterLockManageDialog = () =>
  import("./dialog-matter-lock-manage");

export const showMatterLockManageDialog = (
  element: HTMLElement,
  dialogParams: MatterLockManageDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-lock-manage",
    dialogImport: loadMatterLockManageDialog,
    dialogParams,
  });
};
