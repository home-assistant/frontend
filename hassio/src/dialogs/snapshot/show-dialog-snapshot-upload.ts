import { fireEvent } from "../../../../src/common/dom/fire_event";
import "./dialog-hassio-snapshot-upload";

export interface HassioSnapshotUploadDialogParams {
  loadData: () => Promise<void>;
}

export const showSnapshotUploadDialog = (
  element: HTMLElement,
  dialogParams: HassioSnapshotUploadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-snapshot-upload",
    dialogImport: () =>
      import(
        /* webpackChunkName: "dialog-hassio-snapshot-upload" */ "./dialog-hassio-snapshot-upload"
      ),
    dialogParams,
  });
};
