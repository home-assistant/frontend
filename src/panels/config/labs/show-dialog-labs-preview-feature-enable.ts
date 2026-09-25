import { fireEvent } from "../../../common/dom/fire_event";
import type { LabPreviewFeature } from "../../../data/labs";

export interface LabsPreviewFeatureEnableDialogParams {
  preview_feature: LabPreviewFeature;
  previewFeatureId: string;
  onConfirm: (createBackup: boolean) => void;
}

export const loadLabsPreviewFeatureEnableDialog = () =>
  import("./dialog-labs-preview-feature-enable");

export const showLabsPreviewFeatureEnableDialog = (
  element: HTMLElement,
  params: LabsPreviewFeatureEnableDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-labs-preview-feature-enable",
    dialogImport: loadLabsPreviewFeatureEnableDialog,
    dialogParams: params,
  });
};
