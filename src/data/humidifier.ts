import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export type HumidifierEntity = HassEntityBase & {
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
