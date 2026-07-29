import type { HassEntity } from "home-assistant-js-websocket";
import { isTiltOnly } from "../../data/cover";
import { CameraEntityFeature } from "../../data/feature/camera_entity_feature";
import { ClimateEntityFeature } from "../../data/feature/climate_entity_feature";
import { CoverEntityFeature } from "../../data/feature/cover_entity_feature";
import { MediaPlayerEntityFeature } from "../../data/feature/media-player_entity_feature";
import { SirenEntityFeature } from "../../data/feature/siren_entity_feature";

// These are domains which have nonstandard 'toggle' behavior.
// Otherwise, any domain with a turn_on and turn_off service may be toggled.
// If features are provided, all features must be supported.
interface SpecialToggleAction {
  on: string;
  off?: string;
  feature?: number[];
}

export const SPECIAL_TOGGLE_ACTIONS: Record<string, SpecialToggleAction> = {
  button: {
    on: "press",
  },
  camera: {
    on: "turn_on",
    off: "turn_off",
    feature: [CameraEntityFeature.ON_OFF],
  },
  climate: {
    on: "turn_on",
    off: "turn_off",
    feature: [ClimateEntityFeature.TURN_ON, ClimateEntityFeature.TURN_OFF],
  },
  cover: {
    on: "open_cover",
    off: "close_cover",
    feature: [CoverEntityFeature.OPEN, CoverEntityFeature.CLOSE],
  },
  input_button: {
    on: "press",
  },
  lock: {
    on: "unlock",
    off: "lock",
  },
  media_player: {
    on: "turn_on",
    off: "turn_off",
    feature: [
      MediaPlayerEntityFeature.TURN_ON,
      MediaPlayerEntityFeature.TURN_OFF,
    ],
  },
  scene: {
    on: "turn_on",
  },
  siren: {
    on: "turn_on",
    off: "turn_off",
    feature: [SirenEntityFeature.TURN_ON, SirenEntityFeature.TURN_OFF],
  },
  valve: {
    on: "open_valve",
    off: "close_valve",
  },
};

// This function assumes that the passed domain can toggle, it may otherwise
// return a service that does not exist.
export const getToggleAction = (
  domain: string,
  onOff: boolean,
  stateObj?: HassEntity
): string => {
  // Tilt-only covers don't support open_cover/close_cover
  if (domain === "cover" && stateObj && isTiltOnly(stateObj)) {
    return onOff ? "open_cover_tilt" : "close_cover_tilt";
  }
  return (
    SPECIAL_TOGGLE_ACTIONS[domain]?.[onOff ? "on" : "off"] ||
    SPECIAL_TOGGLE_ACTIONS[domain]?.["on"] ||
    (onOff ? "turn_on" : "turn_off")
  );
};
