import type { HassEntity } from "home-assistant-js-websocket";
import { CameraEntityFeature } from "../../data/feature/camera_entity_feature";
import { ClimateEntityFeature } from "../../data/feature/climate_entity_feature";
import { CoverEntityFeature } from "../../data/feature/cover_entity_feature";
import { MediaPlayerEntityFeature } from "../../data/feature/media-player_entity_feature";
import { SirenEntityFeature } from "../../data/feature/siren_entity_feature";
import { supportsFeature } from "./supports-feature";

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

// A cover that cannot open and close, but can tilt both ways, is toggled
// through its tilt actions instead.
const TILT_ONLY_COVER_TOGGLE_ACTION: SpecialToggleAction = {
  on: "open_cover_tilt",
  off: "close_cover_tilt",
  feature: [CoverEntityFeature.OPEN_TILT, CoverEntityFeature.CLOSE_TILT],
};

export const usesCoverTiltToggleAction = (
  domain: string,
  stateObj?: HassEntity
): boolean =>
  domain === "cover" &&
  !!stateObj &&
  !(
    supportsFeature(stateObj, CoverEntityFeature.OPEN) &&
    supportsFeature(stateObj, CoverEntityFeature.CLOSE)
  ) &&
  supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) &&
  supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT);

// Some domains resolve their toggle action from the features of the entity
// rather than from the domain alone.
export const getSpecialToggleAction = (
  domain: string,
  stateObj?: HassEntity
): SpecialToggleAction | undefined =>
  usesCoverTiltToggleAction(domain, stateObj)
    ? TILT_ONLY_COVER_TOGGLE_ACTION
    : SPECIAL_TOGGLE_ACTIONS[domain];

// This function assumes that the passed domain can toggle, it may otherwise
// return a service that does not exist.
export const getToggleAction = (
  domain: string,
  onOff: boolean,
  stateObj?: HassEntity
): string => {
  const toggleAction = getSpecialToggleAction(domain, stateObj);

  return (
    toggleAction?.[onOff ? "on" : "off"] ||
    toggleAction?.["on"] ||
    (onOff ? "turn_on" : "turn_off")
  );
};
