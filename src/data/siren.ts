import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const enum SirenEntityFeature {
  TURN_ON = 1,
  TURN_OFF = 2,
  TONES = 4,
  VOLUME_SET = 8,
  DURATION = 16,
}

interface SirenEntityAttributes extends HassEntityAttributeBase {
  available_tones?: string[];
}

export interface SirenEntity extends HassEntityBase {
  attributes: SirenEntityAttributes;
}
