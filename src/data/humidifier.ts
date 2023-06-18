import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { FIXED_DOMAIN_STATES } from "../common/entity/get_states";
import { UNAVAILABLE_STATES } from "./entity";

type HumidifierState =
  | (typeof FIXED_DOMAIN_STATES.humidifier)[number]
  | (typeof UNAVAILABLE_STATES)[number];

export type HumidifierEntity = HassEntityBase & {
  state: HumidifierState;
  attributes: HassEntityAttributeBase & {
    humidity?: number;
    min_humidity?: number;
    max_humidity?: number;
    mode?: string;
    available_modes?: string[];
  };
};

export const HUMIDIFIER_SUPPORT_MODES = 1;

export const HUMIDIFIER_DEVICE_CLASS_HUMIDIFIER = "humidifier";
export const HUMIDIFIER_DEVICE_CLASS_DEHUMIDIFIER = "dehumidifier";
