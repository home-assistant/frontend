import {
  mdiKeyboard,
  mdiNavigationVariant,
  mdiReload,
  mdiServerNetwork,
  mdiStorePlus,
} from "@mdi/js";
import {
  filterNavigationPages,
  type NavigationFilterOptions,
} from "../common/config/filter_navigation_pages";
import { componentsWithService } from "../common/config/components_with_service";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import { configSections } from "../panels/config/ha-panel-config";
import type { FuseWeightedKey } from "../resources/fuseMultiTerm";
import type { HomeAssistant } from "../types";
import type { HassioAddonInfo } from "./hassio/addon";
import { domainToName } from "./integration";
import { getPanelIcon, getPanelNameTranslationKey } from "./panel";

export interface NavigationComboBoxItem extends PickerComboBoxItem {
  path: string;
  image?: string;
  iconColor?: string;
}

export interface BaseNavigationCommand {
  path: string;
  primary: string;
  secondary?: string;
  icon_path?: string;
  iconPath?: string;
  iconColor?: string;
  image?: string;
}

export interface ActionCommandComboBoxItem extends PickerComboBoxItem {
  action: string;
  domain?: string;
}

export interface NavigationInfo extends PageNavigation {
  primary: string;
}

const generateNavigationPanelCommands = (
  localize: HomeAssistant["localize"],
  panels: HomeAssistant["panels"],
  apps?: HassioAddonInfo[]
): BaseNavigationCommand[] =>
  Object.entries(panels)
    .filter(
      ([panelKey]) =>
        panelKey !== "_my_redirect" &&
        panelKey !== "hassio" &&
        panelKey !== "app"
    )
    .map(([_panelKey, panel]) => {
      const translationKey = getPanelNameTranslationKey(panel);
      const icon = getPanelIcon(panel) || "mdi:view-dashboard";

      const primary = localize(translationKey) || panel.title || panel.url_path;

      let image: string | undefined;

      if (apps) {
        const app = apps.find(({ slug }) => slug === panel.url_path);
        if (app) {
          image = app.icon ? `/api/hassio/addons/${app.slug}/icon` : undefined;
        }
      }

      return {
        primary,
        icon,
        image,
        path: `/${panel.url_path}`,
      };
    });

const getNavigationInfoFromConfig = (
  localize: HomeAssistant["localize"],
  page: PageNavigation
): NavigationInfo | undefined => {
  const path = page.path.substring(1);

  let name = path.substring(path.indexOf("/") + 1);
  name = name.indexOf("/") > -1 ? name.substring(0, name.indexOf("/")) : name;

  const caption =
    (name && localize(`ui.dialogs.quick-bar.commands.navigation.${name}`)) ||
    // @ts-expect-error
    (page.translationKey && localize(page.translationKey));

  if (caption) {
    return { ...page, primary: caption };
  }

  return undefined;
};

const generateNavigationConfigSectionCommands = (
  hass: HomeAssistant,
  filterOptions: NavigationFilterOptions = {}
): BaseNavigationCommand[] => {
  if (!hass.user?.is_admin) {
    return [];
  }

  const items: NavigationInfo[] = [];
  const allPages = Object.values(configSections).flat();
  const visiblePages = filterNavigationPages(hass, allPages, filterOptions);

  for (const page of visiblePages) {
    const info = getNavigationInfoFromConfig(hass.localize, page);

    if (!info) {
      continue;
    }
    // Add to list, but only if we do not already have an entry for the same path and component
    if (items.some((e) => e.path === info.path)) {
      continue;
    }

    items.push(info);
  }

  return items;
};

const finalizeNavigationCommands = (
  localize: HomeAssistant["localize"],
  items: BaseNavigationCommand[]
): NavigationComboBoxItem[] =>
  items.map((item, index) => {
    const secondary = localize(
      "ui.dialogs.quick-bar.commands.types.navigation"
    );
    return {
      id: `navigation_${index}_${item.path}`,
      icon_path: item.iconPath || mdiNavigationVariant,
      secondary: item.secondary || secondary,
      sorting_label: `${item.primary}_${secondary}`,
      ...item,
    };
  });

export const generateNavigationCommands = (
  hass: HomeAssistant,
  apps?: HassioAddonInfo[],
  filterOptions: NavigationFilterOptions = {}
): NavigationComboBoxItem[] => {
  const panelItems = generateNavigationPanelCommands(
    hass.localize,
    hass.panels,
    apps
  );

  const sectionItems = generateNavigationConfigSectionCommands(
    hass,
    filterOptions
  );
  const appItems: BaseNavigationCommand[] = [];
  if (hass.user?.is_admin && isComponentLoaded(hass, "hassio")) {
    appItems.push({
      path: "/config/apps/available",
      icon_path: mdiStorePlus,
      primary: hass.localize(
        "ui.dialogs.quick-bar.commands.navigation.app_store"
      ),
      iconColor: "#F1C447",
    });
    if (apps) {
      for (const app of apps.filter((a) => a.version)) {
        appItems.push({
          path: `/config/app/${app.slug}`,
          image: app.icon ? `/api/hassio/addons/${app.slug}/icon` : undefined,
          primary: hass.localize(
            "ui.dialogs.quick-bar.commands.navigation.app_info",
            { app: app.name }
          ),
          secondary: hass.localize(
            "ui.dialogs.quick-bar.commands.types.app_settings"
          ),
          iconColor: "#F1C447",
        });
      }
    }
  }

  const additionalItems = [
    {
      path: "",
      primary: hass.localize(
        "ui.dialogs.quick-bar.commands.navigation.shortcuts"
      ),
      icon_path: mdiKeyboard,
    },
  ];

  return finalizeNavigationCommands(hass.localize, [
    ...panelItems,
    ...sectionItems,
    ...appItems,
    ...additionalItems,
  ]);
};

const generateReloadCommands = (
  hass: HomeAssistant
): ActionCommandComboBoxItem[] => {
  // Get all domains that have a direct "reload" service
  const reloadableDomains = componentsWithService(hass, "reload");

  const commands = reloadableDomains.map((domain) => ({
    primary:
      hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
      hass.localize("ui.dialogs.quick-bar.commands.reload.reload", {
        domain: domainToName(hass.localize, domain),
      }),
    domain,
    action: "reload",
    icon_path: mdiReload,
    secondary: hass.localize(`ui.dialogs.quick-bar.commands.types.reload`),
  }));

  // Add "frontend.reload_themes"
  commands.push({
    primary: hass.localize("ui.dialogs.quick-bar.commands.reload.themes"),
    domain: "frontend",
    action: "reload_themes",
    icon_path: mdiReload,
    secondary: hass.localize("ui.dialogs.quick-bar.commands.types.reload"),
  });

  // Add "homeassistant.reload_core_config"
  commands.push({
    primary: hass.localize("ui.dialogs.quick-bar.commands.reload.core"),
    domain: "homeassistant",
    action: "reload_core_config",
    icon_path: mdiReload,
    secondary: hass.localize("ui.dialogs.quick-bar.commands.types.reload"),
  });

  // Add "homeassistant.reload_all"
  commands.push({
    primary: hass.localize("ui.dialogs.quick-bar.commands.reload.all"),
    domain: "homeassistant",
    action: "reload_all",
    icon_path: mdiReload,
    secondary: hass.localize("ui.dialogs.quick-bar.commands.types.reload"),
  });

  return commands.map((command, index) => ({
    ...command,
    id: `command_${index}_${command.primary}`,
    sorting_label: `${command.primary}_${command.secondary}_${command.domain}`,
  }));
};

const generateServerControlCommands = (
  hass: HomeAssistant
): ActionCommandComboBoxItem[] => {
  const serverActions = ["restart", "stop"] as const;

  return serverActions.map((action, index) => {
    const primary = hass.localize(
      "ui.dialogs.quick-bar.commands.home_assistant_control.perform_action",
      {
        action: hass.localize(
          `ui.dialogs.quick-bar.commands.home_assistant_control.${action}`
        ),
      }
    );

    const secondary = hass.localize(
      "ui.dialogs.quick-bar.commands.types.home_assistant_control"
    );

    return {
      id: `server_control_${index}_${action}`,
      primary,
      domain: "homeassistant",
      icon_path: mdiServerNetwork,
      secondary,
      sorting_label: `${primary}_${secondary}_${action}`,
      action,
    };
  });
};

export const generateActionCommands = (
  hass: HomeAssistant
): ActionCommandComboBoxItem[] => [
  ...generateReloadCommands(hass),
  ...generateServerControlCommands(hass),
];

export const commandComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "domain",
    weight: 8,
  },
  {
    name: "secondary",
    weight: 6,
  },
];

export const navigateComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "path",
    weight: 8,
  },
  {
    name: "secondary",
    weight: 6,
  },
];
