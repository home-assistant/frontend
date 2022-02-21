import {
  mdiServerNetwork,
  mdiNavigationVariantOutline,
  mdiEarth,
  mdiReload,
} from "@mdi/js";
import { canShowPage } from "../common/config/can_show_page";
import { componentsWithService } from "../common/config/components_with_service";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeStateName } from "../common/entity/compute_state_name";
import { domainIcon } from "../common/entity/domain_icon";
import { navigate } from "../common/navigate";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { ScorableTextItem } from "../common/string/filter/sequence-matching";
import {
  ConfirmationDialogParams,
  showConfirmationDialog,
} from "../dialogs/generic/show-dialog-box";
import { QuickBar } from "../dialogs/quick-bar/ha-quick-bar";
import { PageNavigation } from "../layouts/hass-tabs-subpage";
import { configSections } from "../panels/config/ha-panel-config";
import { HomeAssistant } from "../types";
import { domainToName } from "./integration";
import { getPanelNameTranslationKey } from "./panel";

export interface QuickBarItem extends ScorableTextItem {
  primaryText: string;
  primaryTextAlt?: string;
  secondaryText: string;
  categoryKey:
    | "reload"
    | "navigation"
    | "server_control"
    | "entity"
    | "suggestion";
  action(data?: any): void;
  iconPath?: string;
  icon?: string;
  path?: string;
}

export type NavigationInfo = PageNavigation &
  Pick<QuickBarItem, "primaryText" | "secondaryText">;

export type BaseNavigationCommand = Pick<QuickBarItem, "primaryText" | "path">;

export const generateEntityItems = (
  element: QuickBar,
  hass: HomeAssistant
): QuickBarItem[] =>
  Object.keys(hass.states)
    .map((entityId) => {
      const entityState = hass.states[entityId];
      const entityItem = {
        primaryText: computeStateName(entityState),
        primaryTextAlt: entityId,
        secondaryText: hass.userData?.showAdvanced
          ? entityId
          : computeStateDisplay(hass.localize, entityState, hass.locale),
        icon: entityState.attributes.icon,
        iconPath: entityState.attributes.icon
          ? undefined
          : domainIcon(computeDomain(entityId), entityState),
        action: () => fireEvent(element, "hass-more-info", { entityId }),
        categoryKey: "entity" as const,
      };

      return {
        ...entityItem,
        strings: [entityItem.primaryText, entityItem.secondaryText],
      };
    })
    .sort((a, b) => caseInsensitiveStringCompare(a.primaryText, b.primaryText));

export const generateCommandItems = (
  element: QuickBar,
  hass: HomeAssistant
): Array<QuickBarItem[]> => [
  generateNavigationCommands(hass),
  generateReloadCommands(hass),
  generateServerControlCommands(element, hass),
];

export const generateReloadCommands = (hass: HomeAssistant): QuickBarItem[] => {
  // Get all domains that have a direct "reload" service
  const reloadableDomains = componentsWithService(hass, "reload");

  const commands = reloadableDomains.map((domain) => ({
    primaryText:
      hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
      hass.localize(
        "ui.dialogs.quick-bar.commands.reload.reload",
        "domain",
        domainToName(hass.localize, domain)
      ),
    action: () => hass.callService(domain, "reload"),
    secondaryText: "Reload changes made to the domain file",
  }));

  // Add "frontend.reload_themes"
  commands.push({
    primaryText: hass.localize("ui.dialogs.quick-bar.commands.reload.themes"),
    action: () => hass.callService("frontend", "reload_themes"),
    secondaryText: "Reload changes made to themes.yaml",
  });

  // Add "homeassistant.reload_core_config"
  commands.push({
    primaryText: hass.localize("ui.dialogs.quick-bar.commands.reload.core"),
    action: () => hass.callService("homeassistant", "reload_core_config"),
    secondaryText: "Reload changes made to configuration.yaml",
  });

  return commands.map((command) => ({
    ...command,
    categoryKey: "reload",
    iconPath: mdiReload,
    strings: [
      `${hass.localize("ui.dialogs.quick-bar.commands.types.reload")} ${
        command.primaryText
      }`,
    ],
  }));
};

export const generateServerControlCommands = (
  element: QuickBar,
  hass: HomeAssistant
): QuickBarItem[] => {
  const serverActions = ["restart", "stop"];

  return serverActions.map((action) => {
    const categoryKey: QuickBarItem["categoryKey"] = "server_control";

    const item = {
      primaryText: hass.localize(
        "ui.dialogs.quick-bar.commands.server_control.perform_action",
        "action",
        hass.localize(`ui.dialogs.quick-bar.commands.server_control.${action}`)
      ),
      categoryKey,
      action: () => hass.callService("homeassistant", action),
    };

    return generateConfirmationCommand(
      element,
      {
        ...item,
        strings: [
          `${hass.localize(
            `ui.dialogs.quick-bar.commands.types.${categoryKey}`
          )} ${item.primaryText}`,
        ],
        secondaryText: "Control your server",
        iconPath: mdiServerNetwork,
      },
      hass.localize("ui.dialogs.generic.ok")
    );
  });
};

export const generateNavigationCommands = (
  hass: HomeAssistant
): QuickBarItem[] => {
  const panelItems = generateNavigationPanelCommands(hass);
  const sectionItems = generateNavigationConfigSectionCommands(hass);

  return finalizeNavigationCommands([...panelItems, ...sectionItems], hass);
};

export const generateNavigationPanelCommands = (
  hass: HomeAssistant
): BaseNavigationCommand[] =>
  Object.keys(hass.panels)
    .filter((panelKey) => panelKey !== "_my_redirect")
    .map((panelKey) => {
      const panel = hass.panels[panelKey];
      const translationKey = getPanelNameTranslationKey(panel);

      const primaryText =
        hass.localize(translationKey) || panel.title || panel.url_path;

      return {
        primaryText,
        path: `/${panel.url_path}`,
        icon: panel.icon,
        secondaryText: "Panel",
      };
    });

export const generateNavigationConfigSectionCommands = (
  hass: HomeAssistant
): BaseNavigationCommand[] => {
  const items: NavigationInfo[] = [];

  for (const sectionKey of Object.keys(configSections)) {
    for (const page of configSections[sectionKey]) {
      if (!canShowPage(hass, page)) {
        continue;
      }
      if (!page.component) {
        continue;
      }
      const info = getNavigationInfoFromConfig(page, hass);

      if (!info) {
        continue;
      }
      // Add to list, but only if we do not already have an entry for the same path and component
      if (
        items.some(
          (e) => e.path === info.path && e.component === info.component
        )
      ) {
        continue;
      }

      items.push({
        iconPath: mdiNavigationVariantOutline,
        ...info,
      });
    }
  }

  return items;
};

export const getNavigationInfoFromConfig = (
  page: PageNavigation,
  hass: HomeAssistant
): NavigationInfo | undefined => {
  if (!page.component) {
    return undefined;
  }
  const caption = hass.localize(
    `ui.dialogs.quick-bar.commands.navigation.${page.component}`
  );

  if (page.translationKey && caption) {
    return {
      ...page,
      primaryText: caption,
      secondaryText: "Configuration Page",
    };
  }

  return undefined;
};

export const generateConfirmationCommand = (
  element: QuickBar,
  item: QuickBarItem,
  confirmText: ConfirmationDialogParams["confirmText"]
): QuickBarItem => ({
  ...item,
  action: () =>
    showConfirmationDialog(element, {
      confirmText,
      confirm: item.action,
    }),
});

const finalizeNavigationCommands = (
  items: BaseNavigationCommand[],
  hass: HomeAssistant
): QuickBarItem[] =>
  items.map((item) => {
    const categoryKey: QuickBarItem["categoryKey"] = "navigation";

    const navItem = {
      secondaryText: "Navigation",
      iconPath: mdiEarth,
      ...item,
      action: () => navigate(item.path!),
    };

    return {
      categoryKey,
      ...navItem,
      strings: [
        `${hass.localize(
          `ui.dialogs.quick-bar.commands.types.${categoryKey}`
        )} ${navItem.primaryText}`,
      ],
    };
  });
