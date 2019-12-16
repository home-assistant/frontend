import { fireEvent } from "../../../../src/common/dom/fire_event";

export interface HassioSnapshotDialogParams {
  slug: string;
  onDelete: () => void;
}

export const showHassioSnapshotDialog = (
  element: HTMLElement,
  dialogParams: HassioSnapshotDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-snapshot",
    dialogImport: () =>
      import(
        /* webpackChunkName: "dialog-hassio-snapshot" */ "./dialog-hassio-snapshot"
      ),
    dialogParams,
  });
};
