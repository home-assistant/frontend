import {
  mdiBackupRestore,
  mdiCogs,
  mdiPuzzle,
  mdiViewDashboard,
} from "@mdi/js";
import { atLeastVersion } from "../../src/common/config/version";
import type { PageNavigation } from "../../src/layouts/hass-tabs-subpage";
import { HomeAssistant } from "../../src/types";

export const supervisorTabs = (hass: HomeAssistant): PageNavigation[] =>
  atLeastVersion(hass.config.version, 2022, 5)
    ? []
    : [
        {
          translationKey: atLeastVersion(hass.config.version, 2021, 12)
            ? "panel.addons"
            : "panel.dashboard",
          path: `/hassio/dashboard`,
          iconPath: atLeastVersion(hass.config.version, 2021, 12)
            ? mdiPuzzle
            : mdiViewDashboard,
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
