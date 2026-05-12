import {
  mdiCalendarAlert,
  mdiChartTimeline,
  mdiCodeBraces,
  mdiCogPlay,
  mdiDatabaseSearch,
  mdiFileDocumentOutline,
  mdiMessageText,
} from "@mdi/js";
import type { LocalizeKeys } from "../../../common/translations/localize";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";

type DeveloperToolsPageNavigation = PageNavigation & {
  translationKey: LocalizeKeys;
};

export const developerToolsTabs: DeveloperToolsPageNavigation[] = [
  {
    path: "/config/developer-tools/yaml",
    translationKey: "ui.panel.config.developer-tools.tabs.yaml.title",
    iconPath: mdiFileDocumentOutline,
  },
  {
    path: "/config/developer-tools/state",
    translationKey: "ui.panel.config.developer-tools.tabs.states.title",
    iconPath: mdiDatabaseSearch,
  },
  {
    path: "/config/developer-tools/action",
    translationKey: "ui.panel.config.developer-tools.tabs.actions.title",
    iconPath: mdiCogPlay,
  },
  {
    path: "/config/developer-tools/template",
    translationKey: "ui.panel.config.developer-tools.tabs.templates.title",
    iconPath: mdiCodeBraces,
  },
  {
    path: "/config/developer-tools/event",
    translationKey: "ui.panel.config.developer-tools.tabs.events.title",
    iconPath: mdiCalendarAlert,
  },
  {
    path: "/config/developer-tools/statistics",
    translationKey: "ui.panel.config.developer-tools.tabs.statistics.title",
    iconPath: mdiChartTimeline,
  },
  {
    path: "/config/developer-tools/assist",
    translationKey: "ui.panel.config.developer-tools.tabs.assist.title",
    iconPath: mdiMessageText,
  },
];

export const developerToolsMenuPages: DeveloperToolsPageNavigation[] = [
  {
    path: "/config/developer-tools/debug",
    translationKey: "ui.panel.config.developer-tools.tabs.debug.title",
  },
];

export const getDeveloperToolsTabs = (): PageNavigation[] => developerToolsTabs;
