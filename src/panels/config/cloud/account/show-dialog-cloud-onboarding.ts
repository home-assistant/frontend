import { fireEvent } from "../../../../common/dom/fire_event";
import type { BackupConfig } from "../../../../data/backup";
import type { CloudStatusLoggedIn } from "../../../../data/cloud";

export interface CloudOnboardingDialogParams {
  cloudStatus: CloudStatusLoggedIn;
  backupConfig?: BackupConfig;
  // Called after each successful change so the opener can refresh the page
  // behind the dialog (the dialog keeps its own copy live independently).
  onChanged?: () => void;
}

export const loadCloudOnboardingDialog = () =>
  import("./dialog-cloud-onboarding");

export const showCloudOnboardingDialog = (
  element: HTMLElement,
  dialogParams: CloudOnboardingDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-cloud-onboarding",
    dialogImport: loadCloudOnboardingDialog,
    dialogParams,
  });
};
