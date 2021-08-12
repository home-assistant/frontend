import { mdiBackupRestore, mdiCogs, mdiStore, mdiViewDashboard } from "@mdi/js";
import type { PageNavigation } from "../../src/layouts/hass-tabs-subpage";

export const supervisorTabs: PageNavigation[] = [
  {
    translationKey: "panel.dashboard",
    path: `/hassio/dashboard`,
    iconPath: mdiViewDashboard,
  },
  {
    translationKey: "panel.store",
    path: `/hassio/store`,
    iconPath: mdiStore,
  },
  {
    translationKey: "panel.backups",
    path: `/hassio/backups`,
    iconPath: mdiBackupRestore,
  },
  {
    translationKey: "panel.system",
    path: `/hassio/system`,
    iconPath: mdiCogs,
  },
];
