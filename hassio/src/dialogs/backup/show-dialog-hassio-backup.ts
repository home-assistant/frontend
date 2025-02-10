import { fireEvent } from "../../../../src/common/dom/fire_event";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioBackupDialogParams {
  slug: string;
  onDelete?: () => void;
  onRestoring?: () => void;
  onboarding?: boolean;
  supervisor?: Supervisor;
}

export const showHassioBackupDialog = (
  element: HTMLElement,
  dialogParams: HassioBackupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-backup",
    dialogImport: () => import("./dialog-hassio-backup"),
    dialogParams,
  });
};
