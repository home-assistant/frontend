import {
  mdiKeyboard,
  mdiNavigationVariant,
  mdiPuzzle,
  mdiReload,
  mdiServerNetwork,
  mdiStorePlus,
} from "@mdi/js";
import { canShowPage } from "../common/config/can_show_page";
import { componentsWithService } from "../common/config/components_with_service";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import { configSections } from "../panels/config/ha-panel-config";
import type { HomeAssistant } from "../types";
import type { HassioAddonInfo } from "./hassio/addon";
import { domainToName } from "./integration";
import { getPanelIcon, getPanelNameTranslationKey } from "./panel";
import type { FuseWeightedKey } from "../resources/fuseMultiTerm";

export interface NavigationComboBoxItem extends PickerComboBoxItem {
  path: string;
  image?: string;
  iconColor?: string;
}

export interface BaseNavigationCommand {
  path: string;
  primary: string;
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
  addons?: HassioAddonInfo[]
): BaseNavigationCommand[] =>
  Object.entries(panels)
    .filter(
      ([panelKey]) => panelKey !== "_my_redirect" && panelKey !== "hassio"
    )
    .map(([_panelKey, panel]) => {
      const translationKey = getPanelNameTranslationKey(panel);
      const icon = getPanelIcon(panel) || "mdi:view-dashboard";

      const primary = localize(translationKey) || panel.title || panel.url_path;

      let image: string | undefined;

      if (addons) {
        const addon = addons.find(({ slug }) => slug === panel.url_path);
        if (addon) {
          image = addon.icon
            ? `/api/hassio/addons/${addon.slug}/icon`
            : undefined;
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
  hass: HomeAssistant
): BaseNavigationCommand[] => {
  if (!hass.user?.is_admin) {
    return [];
  }

  const items: NavigationInfo[] = [];

  Object.values(configSections).forEach((sectionPages) => {
    sectionPages.forEach((page) => {
      if (!canShowPage(hass, page)) {
        return;
      }

      const info = getNavigationInfoFromConfig(hass.localize, page);

      if (!info) {
        return;
      }
      // Add to list, but only if we do not already have an entry for the same path and component
      if (items.some((e) => e.path === info.path)) {
        return;
      }

      items.push(info);
    });
  });

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
      secondary,
      sorting_label: `${item.primary}_${secondary}`,
      ...item,
    };
  });

export const generateNavigationCommands = (
  hass: HomeAssistant,
  addons?: HassioAddonInfo[]
): NavigationComboBoxItem[] => {
  const panelItems = generateNavigationPanelCommands(
    hass.localize,
    hass.panels,
    addons
  );
  const sectionItems = generateNavigationConfigSectionCommands(hass);
  const supervisorItems: BaseNavigationCommand[] = [];
  if (hass.user?.is_admin && isComponentLoaded(hass, "hassio")) {
    supervisorItems.push({
      path: "/hassio/store",
      icon_path: mdiStorePlus,
      primary: hass.localize(
        "ui.dialogs.quick-bar.commands.navigation.addon_store"
      ),
    });
    supervisorItems.push({
      path: "/hassio/dashboard",
      icon_path: mdiPuzzle,
      primary: hass.localize(
        "ui.dialogs.quick-bar.commands.navigation.addon_dashboard"
      ),
    });
    if (addons) {
      for (const addon of addons.filter((a) => a.version)) {
        supervisorItems.push({
          path: `/hassio/addon/${addon.slug}`,
          image: addon.icon
            ? `/api/hassio/addons/${addon.slug}/icon`
            : undefined,
          primary: hass.localize(
            "ui.dialogs.quick-bar.commands.navigation.addon_info",
            { addon: addon.name }
          ),
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
    ...supervisorItems,
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
      "ui.dialogs.quick-bar.commands.server_control.perform_action",
      {
        action: hass.localize(
          `ui.dialogs.quick-bar.commands.server_control.${action}`
        ),
      }
    );

    const secondary = hass.localize(
      "ui.dialogs.quick-bar.commands.types.server_control"
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
