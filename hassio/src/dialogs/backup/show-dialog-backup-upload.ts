import "./dialog-hassio-backup-upload";

import { fireEvent } from "../../../../src/common/dom/fire_event";

export interface HassioBackupUploadDialogParams {
  showBackup: (slug: string) => void;
  reloadBackup?: () => Promise<void>;
  onboarding?: boolean;
}

export const showBackupUploadDialog = (
  element: HTMLElement,
  dialogParams: HassioBackupUploadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-backup-upload",
    dialogImport: () => import("./dialog-hassio-backup-upload"),
    dialogParams,
  });
};
