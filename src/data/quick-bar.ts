import {
  mdiEarth,
  mdiNavigationVariantOutline,
  mdiReload,
  mdiServerNetwork,
} from "@mdi/js";
import { canShowPage } from "../common/config/can_show_page";
import { componentsWithService } from "../common/config/components_with_service";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeStateName } from "../common/entity/compute_state_name";
import { domainIcon } from "../common/entity/domain_icon";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { ScorableTextItem } from "../common/string/filter/sequence-matching";
import { QuickBar } from "../dialogs/quick-bar/ha-quick-bar";
import { PageNavigation } from "../layouts/hass-tabs-subpage";
import { configSections } from "../panels/config/ha-panel-config";
import { HomeAssistant } from "../types";
import { AreaRegistryEntry } from "./area_registry";
import { computeDeviceName, DeviceRegistryEntry } from "./device_registry";
import { EntityRegistryEntry } from "./entity_registry";
import { domainToName } from "./integration";
import { getPanelNameTranslationKey } from "./panel";

export interface QuickBarItem extends ScorableTextItem {
  primaryText: string;
  primaryTextAlt?: string;
  secondaryText?: string;
  metaText?: string;
  categoryKey:
    | "reload"
    | "navigation"
    | "server_control"
    | "entity"
    | "suggestion";
  actionData: string | string[];
  iconPath?: string;
  icon?: string;
  path?: string;
  isSuggestion?: boolean;
}

export type NavigationInfo = PageNavigation &
  Pick<QuickBarItem, "primaryText" | "secondaryText">;

export type BaseNavigationCommand = Pick<QuickBarItem, "primaryText" | "path">;

export const generateEntityItems = (
  hass: HomeAssistant,
  entities: { [entityId: string]: EntityRegistryEntry },
  devices: { [deviceId: string]: DeviceRegistryEntry },
  areas: { [areaId: string]: AreaRegistryEntry }
): QuickBarItem[] =>
  Object.keys(hass.states)
    .map((entityId) => {
      const entityState = hass.states[entityId];
      const entity = entities[entityId];
      const deviceName = entity?.device_id
        ? computeDeviceName(devices[entity.device_id], hass)
        : undefined;
      const entityItem = {
        primaryText: computeStateName(entityState),
        primaryTextAlt: computeStateDisplay(
          hass.localize,
          entityState,
          hass.locale
        ),
        secondaryText:
          (deviceName ? `${deviceName} | ` : "") +
          (hass.userData?.showAdvanced ? entityId : ""),
        metaText: entity?.area_id ? areas[entity.area_id].name : undefined,
        icon: entityState.attributes.icon,
        iconPath: entityState.attributes.icon
          ? undefined
          : domainIcon(computeDomain(entityId), entityState),
        actionData: entityId,
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
    actionData: [domain, "reload"],
    secondaryText: "Reload changes made to the domain file",
  }));

  // Add "frontend.reload_themes"
  commands.push({
    primaryText: hass.localize("ui.dialogs.quick-bar.commands.reload.themes"),
    actionData: ["frontend", "reload_themes"],
    secondaryText: "Reload changes made to themes.yaml",
  });

  // Add "homeassistant.reload_core_config"
  commands.push({
    primaryText: hass.localize("ui.dialogs.quick-bar.commands.reload.core"),
    actionData: ["homeassistant", "reload_core_config"],
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
      actionData: action,
    };

    return {
      ...item,
      strings: [
        `${hass.localize(
          `ui.dialogs.quick-bar.commands.types.${categoryKey}`
        )} ${item.primaryText}`,
      ],
      secondaryText: "Control your server",
      iconPath: mdiServerNetwork,
    };
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
      actionData: item.path!,
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
