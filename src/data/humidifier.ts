import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export type HumidifierEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    humidity?: number;
    current_humidity?: number;
    min_humidity?: number;
    max_humidity?: number;
    mode?: string;
    action?: HumidifierAction;
    available_modes?: string[];
    current_humidity?: number;
  };
};

export const enum HumidifierEntityFeature {
  MODES = 1,
}

export const enum HumidifierEntityDeviceClass {
  HUMIDIFIER = "humidifier",
  DEHUMIDIFIER = "dehumidifier",
}
