import { fireEvent } from "../../../../src/common/dom/fire_event";
import { LocalizeFunc } from "../../../../src/common/translations/localize";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioBackupDialogParams {
  slug: string;
  onDelete?: () => void;
  onRestoring?: () => void;
  onboarding?: boolean;
  supervisor?: Supervisor;
  localize?: LocalizeFunc;
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
