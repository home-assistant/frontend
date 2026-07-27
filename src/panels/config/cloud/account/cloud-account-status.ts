import type { BackupConfig } from "../../../../data/backup";
import { cloudBackupHealth } from "../../../../data/backup";
import type {
  CloudOnboardingItem,
  CloudStatusLoggedIn,
} from "../../../../data/cloud";
import { ONBOARDING_ITEMS } from "../../../../data/cloud";

// Whether a single onboarding step is already set up. Shared so the onboarding
// UI and the "is onboarding complete" check can't drift apart.
export const onboardingPanelCompleted = (
  panel: CloudOnboardingItem,
  cloudStatus: CloudStatusLoggedIn,
  backupConfig?: BackupConfig
): boolean => {
  if (panel === "remote") {
    return cloudStatus.prefs.remote_enabled;
  }

  if (panel === "backup") {
    const health = cloudBackupHealth(backupConfig);
    return health === "success" || health === "old";
  }

  if (panel === "voice") {
    return cloudStatus.alexa_registered || cloudStatus.google_registered;
  }

  return cloudStatus.prefs.cloud_ice_servers_enabled;
};

export const onboardingComplete = (
  cloudStatus: CloudStatusLoggedIn,
  backupConfig?: BackupConfig
): boolean =>
  ONBOARDING_ITEMS.every((panel) =>
    onboardingPanelCompleted(panel, cloudStatus, backupConfig)
  );
