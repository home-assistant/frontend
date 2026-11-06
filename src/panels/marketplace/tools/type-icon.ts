import {
  mdiCodeBraces,
  mdiPackageVariant,
  mdiPalette,
  mdiViewDashboard,
} from "@mdi/js";
import type { RepositoryType } from "../../../data/marketplace/repository";

const TYPE_ICONS: Record<RepositoryType, string> = {
  integration: mdiPackageVariant,
  plugin: mdiViewDashboard,
  template: mdiCodeBraces,
  theme: mdiPalette,
};

export const typeIcon = (type: RepositoryType): string =>
  TYPE_ICONS[type] || mdiPackageVariant;
