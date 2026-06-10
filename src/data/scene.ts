import type {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { navigate } from "../common/navigate";
import type { HomeAssistant, ServiceCallResponse } from "../types";

export const SCENE_IGNORED_DOMAINS = [
  "binary_sensor",
  "button",
  "configuration",
  "device_tracker",
  "event",
  "image_processing",
  "infrared",
  "input_button",
  "persistent_notification",
  "person",
  "radio_frequency",
  "scene",
  "schedule",
  "script",
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

export type SceneEntities = Record<
  string,
  string | { state: string; [key: string]: any }
>;

export type SceneMetaData = Record<
  string,
  { entity_only?: boolean | undefined }
>;

// Hand-edited scenes.yaml is parsed as YAML 1.1 by the backend, so unquoted
// on/off arrive here as booleans and bare numbers as numbers. The backend
// applies boolean states as on/off; mirror that so the badge reflects what
// activating the scene will actually do.
const normalizeSceneEntityState = (sceneState: unknown): string | undefined => {
  if (sceneState == null) {
    return undefined;
  }
  if (typeof sceneState === "boolean") {
    return sceneState ? "on" : "off";
  }
  return String(sceneState);
};

// Builds a state object from the scene's stored target state, so the scene
// editor can render the icon the entity will have once the scene is applied
// rather than its current live icon. The parameter is typed unknown because
// the scene config API returns raw YAML: booleans, numbers, and nulls occur
// in hand-edited files beyond what the SceneEntities union declares.
//
// The result is a partial HassEntity meant for badge rendering only - it has
// no last_changed, last_updated, or context.
export const sceneEntityStateObj = (
  entityId: string,
  sceneEntity: unknown
): HassEntity | undefined => {
  // An entity left without a value in the YAML editor parses as null.
  if (sceneEntity == null) {
    return undefined;
  }
  if (typeof sceneEntity !== "object") {
    return {
      entity_id: entityId,
      state: normalizeSceneEntityState(sceneEntity),
      attributes: {},
    } as HassEntity;
  }
  const { state: sceneState, ...attributes } = sceneEntity as Record<
    string,
    any
  >;
  // The scene snapshots entity_picture with an access token that is stale by
  // the time review mode renders, which would leave the badge showing a
  // broken image instead of an icon. Drop it so the entity's icon resolves.
  delete attributes.entity_picture;
  delete attributes.entity_picture_local;
  return {
    entity_id: entityId,
    state: normalizeSceneEntityState(sceneState),
    attributes,
  } as HassEntity;
};

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
