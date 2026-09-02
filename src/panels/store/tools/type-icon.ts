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

const _IconMap = {
  appdaemon: mdiRobot,
  integration: mdiPackageVariant,
  netdaemon: mdiDotNet,
  plugin: mdiViewDashboard,
  python_script: mdiLanguagePython,
  template: mdiCodeBraces,
  theme: mdiPalette,
};

export const typeIcon = (type: RepositoryType): string => _IconMap[type];
