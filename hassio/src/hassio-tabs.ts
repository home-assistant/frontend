import { mdiBackupRestore, mdiCogs, mdiStore, mdiViewDashboard } from "@mdi/js";
import type { PageNavigation } from "../../src/layouts/hass-tabs-subpage";

export const supervisorTabs: PageNavigation[] = [
  {
    name: "Dashboard",
    path: `/hassio/dashboard`,
    iconPath: mdiViewDashboard,
  },
  {
    name: "Add-on Store",
    path: `/hassio/store`,
    iconPath: mdiStore,
  },
  {
    name: "Snapshots",
    path: `/hassio/snapshots`,
    iconPath: mdiBackupRestore,
  },
  {
    name: "System",
    path: `/hassio/system`,
    iconPath: mdiCogs,
  },
];
