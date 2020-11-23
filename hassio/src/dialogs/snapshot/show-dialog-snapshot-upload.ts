import { fireEvent } from "../../../../src/common/dom/fire_event";
import "./dialog-hassio-snapshot-upload";

export interface HassioSnapshotUploadDialogParams {
  showSnapshot: (slug: string) => void;
  reloadSnapshot?: () => Promise<void>;
  onboarding?: boolean;
}

export const showSnapshotUploadDialog = (
  element: HTMLElement,
  dialogParams: HassioSnapshotUploadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-snapshot-upload",
    dialogImport: () => import("./dialog-hassio-snapshot-upload"),
    dialogParams,
  });
};
