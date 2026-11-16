import { computeDomain } from "../common/entity/compute_domain";
import type { EntityRegistryEntry } from "./entity/entity_registry";

export type PtzDirection = "up" | "right" | "down" | "left";

export const PTZ_DIRECTIONS: PtzDirection[] = ["up", "right", "down", "left"];

/** The entities that move a camera, all on the device of the camera. */
export interface CameraPtzEntities {
  /** Buttons that start moving. Only set together with stop. */
  move?: Record<PtzDirection, string>;
  /** Button that stops moving and zooming */
  stop?: string;
  /** Number entity with the zoom position */
  zoom?: string;
  /** Buttons that start zooming in and out until stopped */
  zoomIn?: string;
  zoomOut?: string;
  /** Select entity with the saved positions */
  preset?: string;
  /** Entities of these controls that are disabled */
  disabled: string[];
}

type PtzKey =
  PtzDirection | Exclude<keyof CameraPtzEntities, "move" | "disabled">;

// Reolink adds PTZ buttons, which keep moving the camera until stopped
const REOLINK_KEYS: Record<string, { domain: string; key: PtzKey }> = {
  ptz_up: { domain: "button", key: "up" },
  ptz_right: { domain: "button", key: "right" },
  ptz_down: { domain: "button", key: "down" },
  ptz_left: { domain: "button", key: "left" },
  ptz_stop: { domain: "button", key: "stop" },
  ptz_zoom_in: { domain: "button", key: "zoomIn" },
  ptz_zoom_out: { domain: "button", key: "zoomOut" },
  zoom: { domain: "number", key: "zoom" },
  ptz_preset: { domain: "select", key: "preset" },
};

/**
 * Finds the entities that pan, tilt and zoom a camera. Only Reolink cameras
 * are known so far.
 *
 * Moving only works with all four directions and stop, as a press starts
 * moving and only the stop button ends it. Disabled entities are still
 * returned, so the user can be told to enable them.
 */
export const findCameraPtzEntities = (
  cameraEntityId: string,
  entities: EntityRegistryEntry[]
): CameraPtzEntities | undefined => {
  const camera = entities.find((entity) => entity.entity_id === cameraEntityId);
  if (!camera?.device_id || camera.platform !== "reolink") {
    return undefined;
  }

  const found: Partial<Record<PtzKey, EntityRegistryEntry>> = {};
  for (const entity of entities) {
    if (
      entity.device_id !== camera.device_id ||
      entity.platform !== "reolink" ||
      !entity.translation_key
    ) {
      continue;
    }
    const match = REOLINK_KEYS[entity.translation_key];
    if (match && computeDomain(entity.entity_id) === match.domain) {
      found[match.key] = entity;
    }
  }

  const result: CameraPtzEntities = { disabled: [] };
  const use = (entity: EntityRegistryEntry) => {
    if (entity.disabled_by) {
      result.disabled.push(entity.entity_id);
    }
    return entity.entity_id;
  };

  const { up, right, down, left, stop } = found;
  if (up && right && down && left && stop) {
    result.move = {
      up: use(up),
      right: use(right),
      down: use(down),
      left: use(left),
    };
    result.stop = use(stop);
  }
  if (found.zoom) {
    result.zoom = use(found.zoom);
  } else if (
    found.zoomIn &&
    found.zoomOut &&
    stop &&
    !found.zoomIn.disabled_by &&
    !found.zoomOut.disabled_by &&
    !stop.disabled_by
  ) {
    // Disabled by default, only used when the user enabled them
    result.zoomIn = found.zoomIn.entity_id;
    result.zoomOut = found.zoomOut.entity_id;
    result.stop = stop.entity_id;
  }
  if (found.preset) {
    result.preset = use(found.preset);
  }

  if (!result.move && !result.zoom && !result.zoomIn && !result.preset) {
    return undefined;
  }
  return result;
};
