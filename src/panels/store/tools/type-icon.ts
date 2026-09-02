import {
  mdiCodeBraces,
  mdiDotNet,
  mdiLanguagePython,
  mdiPackageVariant,
  mdiPalette,
  mdiRobot,
  mdiViewDashboard,
} from "@mdi/js";
import type { RepositoryType } from "../data/repository";

const TYPE_ICONS = {
  appdaemon: mdiRobot,
  integration: mdiPackageVariant,
  netdaemon: mdiDotNet,
  plugin: mdiViewDashboard,
  python_script: mdiLanguagePython,
  template: mdiCodeBraces,
  theme: mdiPalette,
};

export const typeIcon = (type: RepositoryType): string => TYPE_ICONS[type];
