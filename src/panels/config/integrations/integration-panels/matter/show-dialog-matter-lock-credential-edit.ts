import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  MatterLockInfo,
  MatterLockCredentialRef,
} from "../../../../../data/matter-lock";

export interface MatterLockCredentialEditDialogParams {
  device_id: string;
  lockInfo: MatterLockInfo;
  userIndex: number;
  credential?: MatterLockCredentialRef;
  onSaved: () => void;
}

export const loadMatterLockCredentialEditDialog = () =>
  import("./dialog-matter-lock-credential-edit");

export const showMatterLockCredentialEditDialog = (
  element: HTMLElement,
  dialogParams: MatterLockCredentialEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-lock-credential-edit",
    dialogImport: loadMatterLockCredentialEditDialog,
    dialogParams,
  });
};
