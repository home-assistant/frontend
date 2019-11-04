import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

import { HomeAssistant } from "../types";

export const IGNORED_DOMAINS = [
  "sensor",
  "binary_sensor",
  "device_tracker",
  "person",
  "persistent_notification",
  "configuration",
  "image_processing",
  "sun",
  "weather",
  "zone",
];

export const SAVED_ATTRIBUTES = {
  light: [
    "brightness",
    "color_temp",
    "effect",
    "rgb_color",
    "xy_color",
    "hs_color",
  ],
  media_player: [
    "is_volume_muted",
    "volume_level",
    "sound_mode",
    "media_content_id",
    "media_content_type",
  ],
};

export interface SceneEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & { id?: string };
}

export interface SceneConfig {
  name: string;
  entities: EntityStates;
}

export interface EntityStates {
  [entityId: string]: any;
}

export const activateScene = (
  hass: HomeAssistant,
  entityId: string
): Promise<void> =>
  hass.callService("scene", "turn_on", { entity_id: entityId });

export const applyScene = (
  hass: HomeAssistant,
  entities: EntityStates
): Promise<void> => hass.callService("scene", "apply", { entities });

export const getSceneConfig = (
  hass: HomeAssistant,
  sceneId: string
): Promise<SceneConfig> =>
  hass.callApi<SceneConfig>("GET", `config/scene/config/${sceneId}`);

export const saveScene = (
  hass: HomeAssistant,
  sceneId: string,
  config: SceneConfig
) => hass.callApi("POST", `config/scene/config/${sceneId}`, config);

export const deleteScene = (hass: HomeAssistant, id: string) =>
  hass.callApi("DELETE", `config/scene/config/${id}`);
