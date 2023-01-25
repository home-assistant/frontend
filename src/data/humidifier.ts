import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { FIXED_DOMAIN_STATES } from "../common/entity/get_states";
import { TranslationDict } from "../types";
import { UNAVAILABLE_STATES } from "./entity";

type HumidifierState =
  | (typeof FIXED_DOMAIN_STATES.humidifier)[number]
  | (typeof UNAVAILABLE_STATES)[number];
type HumidifierMode =
  keyof TranslationDict["state_attributes"]["humidifier"]["mode"];

export type HumidifierEntity = HassEntityBase & {
  state: HumidifierState;
  attributes: HassEntityAttributeBase & {
    humidity?: number;
    min_humidity?: number;
    max_humidity?: number;
    mode?: HumidifierMode;
    available_modes?: HumidifierMode[];
  };
};

export const HUMIDIFIER_SUPPORT_MODES = 1;

export const HUMIDIFIER_DEVICE_CLASS_HUMIDIFIER = "humidifier";
export const HUMIDIFIER_DEVICE_CLASS_DEHUMIDIFIER = "dehumidifier";
