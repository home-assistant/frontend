import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { navigate } from "../common/navigate";
import { HomeAssistant, ServiceCallResponse } from "../types";

export const SCENE_IGNORED_DOMAINS = [
  "binary_sensor",
  "button",
  "configuration",
  "device_tracker",
  "event",
  "image_processing",
  "input_button",
  "persistent_notification",
  "person",
  "scene",
  "schedule",
  "sensor",
  "sun",
  "update",
  "weather",
  "zone",
];

let inititialSceneEditorData:
  | { config?: Partial<SceneConfig>; areaId?: string }
  | undefined;

export const showSceneEditor = (
  config?: Partial<SceneConfig>,
  areaId?: string
) => {
  inititialSceneEditorData = { config, areaId };
  navigate("/config/scene/edit/new");
};

export const getSceneEditorInitData = () => {
  const data = inititialSceneEditorData;
  inititialSceneEditorData = undefined;
  return data;
};

export interface SceneEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & { id?: string };
}

export interface SceneConfig {
  id?: string;
  name: string;
  icon?: string;
  entities: SceneEntities;
  metadata?: SceneMetaData;
}

export interface SceneEntities {
  [entityId: string]: string | { state: string; [key: string]: any };
}

export interface SceneMetaData {
  [entityId: string]: { entity_only?: boolean | undefined };
}

export const activateScene = (
  hass: HomeAssistant,
  entityId: string
): Promise<ServiceCallResponse> =>
  hass.callService("scene", "turn_on", { entity_id: entityId });

export const applyScene = (
  hass: HomeAssistant,
  entities: SceneEntities
): Promise<ServiceCallResponse> =>
  hass.callService("scene", "apply", { entities });

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
