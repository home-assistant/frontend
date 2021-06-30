import { fireEvent } from "../../../../src/common/dom/fire_event";
import { LocalizeFunc } from "../../../../src/common/translations/localize";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

export interface HassioSnapshotDialogParams {
  slug: string;
  onDelete?: () => void;
  onboarding?: boolean;
  supervisor?: Supervisor;
  localize?: LocalizeFunc;
}

export const showHassioSnapshotDialog = (
  element: HTMLElement,
  dialogParams: HassioSnapshotDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-snapshot",
    dialogImport: () => import("./dialog-hassio-snapshot"),
    dialogParams,
  });
};
