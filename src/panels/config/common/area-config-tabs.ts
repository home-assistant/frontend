import { mdiLabel, mdiMapMarkerRadius, mdiSofa, mdiTag } from "@mdi/js";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";

export const areaConfigTabs: PageNavigation[] = [
  {
    component: "areas",
    path: "/config/areas",
    translationKey: "ui.panel.config.areas.caption",
    iconPath: mdiSofa,
    iconColor: "#2D338F",
    core: true,
    adminOnly: true,
  },
  {
    component: "categories",
    path: "/config/categories",
    translationKey: "ui.panel.config.category.caption",
    iconPath: mdiTag,
    iconColor: "#2D338F",
    core: true,
    adminOnly: true,
  },
  {
    component: "labels",
    path: "/config/labels",
    translationKey: "ui.panel.config.labels.caption",
    iconPath: mdiLabel,
    iconColor: "#2D338F",
    core: true,
    adminOnly: true,
  },
  {
    component: "zone",
    path: "/config/zone",
    translationKey: "ui.panel.config.zone.caption",
    iconPath: mdiMapMarkerRadius,
    iconColor: "#E48629",
    adminOnly: true,
  },
];
