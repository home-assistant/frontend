import type { HassEntity } from "home-assistant-js-websocket";
import {
  computeEntityNameList,
  type EntityNameItem,
} from "../../common/entity/compute_entity_name_display";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../common/translations/localize";
import { computeRTL } from "../../common/util/compute_rtl";
import type {
  NativeModalHeader,
  NativeModalHeaderAction,
  NativeModalHeaderMenuItem,
} from "../../external_app/external_messaging";
import type { HomeAssistant } from "../../types";
import type { MoreInfoView } from "./more-info-view";

/** The names the more-info header shows above the entity's own, most general first. */
export const MORE_INFO_BREADCRUMB_NAME: EntityNameItem[] = [
  { type: "area" },
  { type: "parent_device" },
  { type: "device" },
  { type: "entity" },
];

export interface MoreInfoHeader {
  title: string;
  subtitle?: string;
}

/**
 * The title and breadcrumb the more-info dialog would show for an entity, for
 * a host that draws the header itself, like a companion app's native screen.
 * An entity without a state falls back to its id, as the dialog does.
 */
export const computeMoreInfoHeader = (
  hass: HomeAssistant,
  entityId: string
): MoreInfoHeader => {
  const stateObj = hass.states[entityId] as HassEntity | undefined;
  if (!stateObj) {
    return { title: entityId };
  }
  const names = computeEntityNameList(
    stateObj,
    MORE_INFO_BREADCRUMB_NAME,
    hass.entities,
    hass.devices,
    hass.areas,
    hass.floors
  ).filter((name): name is string => Boolean(name));
  const title = names.pop() || entityId;
  if (!names.length) {
    return { title };
  }
  const isRTL = computeRTL(
    hass.language,
    hass.translationMetadata.translations
  );
  return { title, subtitle: names.join(isRTL ? " ◂ " : " ▸ ") };
};

/** What the more-info dialog's header would offer, without how it renders it. */
export interface NativeMoreInfoHeaderContext {
  localize: LocalizeFunc;
  domain: string;
  title: string;
  subtitle?: string;
  /** The header shows a back button instead of close: a view or a related entity is open. */
  canGoBack: boolean;
  /** The entity's own view; the history, settings and menu buttons belong to it. */
  isDefaultView: boolean;
  view: MoreInfoView;
  /** A child view drawing its own header actions; none of them are offered natively. */
  hasChildViewHeader: boolean;
  showHistory: boolean;
  isAdmin: boolean;
  showAddTo: boolean;
  favorites?: {
    editMode: boolean;
    editModeLabel: string;
    resetLabel: string;
    copyLabel: string;
    canReset: boolean;
    canCopy: boolean;
  };
  /** Set when the entity belongs to a device; `type` is the device's entry type. */
  device?: { type: string };
  showEdit: boolean;
}

/**
 * The header of the standalone more-info page as `modal/update` describes it to
 * the app: the same buttons and menu items the dialog renders, in the same
 * order and under the same conditions, named by the ids the dialog answers in
 * `performHeaderAction`.
 */
export const computeNativeMoreInfoHeader = (
  ctx: NativeMoreInfoHeaderContext
): NativeModalHeader => {
  const { localize } = ctx;
  const actions: NativeModalHeaderAction[] = [];
  const menu: NativeModalHeaderMenuItem[] = [];
  const addToLabel = localize("ui.dialogs.more_info_control.add_to.item");

  if (ctx.isDefaultView) {
    if (ctx.showHistory) {
      actions.push({
        id: "history",
        label: localize("ui.dialogs.more_info_control.history"),
        icon: "mdi:chart-box-outline",
      });
    }
    if (ctx.isAdmin) {
      actions.push({
        id: "settings",
        label: localize("ui.dialogs.more_info_control.settings"),
        icon: "mdi:cog-outline",
      });
      if (ctx.showAddTo) {
        menu.push({
          id: "add_to",
          label: addToLabel,
          icon: "mdi:plus-box-multiple-outline",
          divider_after: true,
        });
      }
      if (ctx.favorites) {
        const { favorites } = ctx;
        menu.push(
          {
            id: "toggle_edit",
            label: favorites.editMode
              ? localize("ui.dialogs.more_info_control.exit_edit_mode")
              : favorites.editModeLabel,
            icon: favorites.editMode ? "mdi:pencil-off" : "mdi:pencil",
          },
          {
            id: "reset_favorites",
            label: favorites.resetLabel,
            icon: "mdi:backup-restore",
            disabled: !favorites.canReset,
          },
          {
            id: "copy_favorites",
            label: favorites.copyLabel,
            icon: "mdi:content-duplicate",
            disabled: !favorites.canCopy,
            divider_after: true,
          }
        );
      }
      if (ctx.device) {
        menu.push({
          id: "device",
          label: localize(
            "ui.dialogs.more_info_control.device_or_service_info",
            {
              type: localize(
                `ui.dialogs.more_info_control.device_type.${ctx.device.type}` as LocalizeKeys
              ),
            }
          ),
          icon:
            ctx.device.type === "service"
              ? "mdi:transit-connection-variant"
              : "mdi:devices",
        });
      }
      if (ctx.showEdit) {
        menu.push({
          id: "edit",
          label:
            localize(
              `ui.dialogs.more_info_control.edit_domain.${ctx.domain}` as LocalizeKeys
            ) || localize("ui.dialogs.more_info_control.edit"),
          icon: "mdi:pencil-outline",
        });
      }
      menu.push(
        {
          id: "related",
          label: localize("ui.dialogs.more_info_control.related"),
          icon: "mdi:link-variant",
        },
        {
          id: "details",
          label: localize("ui.dialogs.more_info_control.details"),
          icon: "mdi:information-outline",
        }
      );
    } else if (ctx.showAddTo) {
      actions.push({
        id: "add_to",
        label: addToLabel,
        icon: "mdi:plus-box-multiple-outline",
      });
    }
  } else if (ctx.view === "details" && !ctx.hasChildViewHeader) {
    actions.push({
      id: "toggle_yaml",
      label: localize("ui.dialogs.more_info_control.toggle_yaml_mode"),
      icon: "mdi:code-braces",
    });
  }

  return {
    title: ctx.title,
    subtitle: ctx.subtitle,
    navigation: ctx.canGoBack ? "back" : "close",
    navigation_label: ctx.canGoBack
      ? localize("ui.dialogs.more_info_control.back_to_info")
      : localize("ui.common.close"),
    menu_label: localize("ui.common.menu"),
    actions,
    menu,
  };
};
