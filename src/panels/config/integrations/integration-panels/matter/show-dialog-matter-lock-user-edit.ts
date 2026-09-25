import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  MatterLockInfo,
  MatterLockUser,
} from "../../../../../data/matter-lock";

export interface MatterLockUserEditDialogParams {
  entity_id: string;
  lockInfo: MatterLockInfo;
  user?: MatterLockUser;
  onSaved: () => void;
}

export const loadMatterLockUserEditDialog = () =>
  import("./dialog-matter-lock-user-edit");

export const showMatterLockUserEditDialog = (
  element: HTMLElement,
  dialogParams: MatterLockUserEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-lock-user-edit",
    dialogImport: loadMatterLockUserEditDialog,
    dialogParams,
  });
};
