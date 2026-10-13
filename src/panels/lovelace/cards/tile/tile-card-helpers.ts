import type { HassEntity } from "home-assistant-js-websocket";
import { DOMAINS_TOGGLE } from "../../../../common/const";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { cameraUrlWithWidthHeight } from "../../../../data/camera";
import type { HomeAssistant } from "../../../../types";
import type { ActionConfigParams } from "../../common/handle-action";
import { hasAction } from "../../common/has-action";
import type { TileActionsConfig } from "../types";

export const getEntityDefaultTileIconAction = (entityId: string) => {
  const domain = computeDomain(entityId);

  const supportsIconAction =
    DOMAINS_TOGGLE.has(domain) ||
    ["button", "input_button", "scene"].includes(domain);

  return supportsIconAction ? "toggle" : "none";
};

export const getTileActionDefaults = (
  entityId: string
): Pick<TileActionsConfig, "tap_action" | "icon_tap_action"> => ({
  tap_action: { action: "more-info" },
  icon_tap_action: { action: getEntityDefaultTileIconAction(entityId) },
});

export const hasTileCardAction = (config?: TileActionsConfig) =>
  !config?.tap_action ||
  hasAction(config.tap_action) ||
  hasAction(config.hold_action) ||
  hasAction(config.double_tap_action);

export const hasTileIconAction = (config?: TileActionsConfig) =>
  !config?.icon_tap_action ||
  hasAction(config.icon_tap_action) ||
  hasAction(config.icon_hold_action) ||
  hasAction(config.icon_double_tap_action);

export const getTileIconActionConfig = (
  entity: string,
  config: TileActionsConfig
): ActionConfigParams => ({
  entity,
  tap_action: config.icon_tap_action,
  hold_action: config.icon_hold_action,
  double_tap_action: config.icon_double_tap_action,
});

export const getTileImageUrl = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  size = 80
): string | undefined => {
  const entityPicture =
    stateObj.attributes.entity_picture_local ||
    stateObj.attributes.entity_picture;

  if (!entityPicture) {
    return undefined;
  }

  const imageUrl = hass.hassUrl(entityPicture);

  return computeDomain(stateObj.entity_id) === "camera"
    ? cameraUrlWithWidthHeight(imageUrl, size, size)
    : imageUrl;
};
