import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const enum FanEntityFeature {
  SET_SPEED = 1,
  OSCILLATE = 2,
  DIRECTION = 4,
  PRESET_MODE = 8,
}

interface FanEntityAttributes extends HassEntityAttributeBase {
  direction?: number;
  oscillating?: boolean;
  percentage?: number;
  percentage_step?: number;
  preset_mode?: string;
  preset_modes?: string[];
}

export interface FanEntity extends HassEntityBase {
  attributes: FanEntityAttributes;
}
