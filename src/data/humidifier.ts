import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export type HumidifierState = "off" | "on";

export type HumidifierAction = "off" | "idle" | "humidifying" | "drying";

export type HumidifierEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    humidity?: number;
    current_humidity?: number;
    min_humidity?: number;
    max_humidity?: number;
    mode?: string;
    action?: HumidifierAction;
    available_modes?: string[];
  };
};

export const enum HumidifierEntityFeature {
  MODES = 1,
}

export const enum HumidifierEntityDeviceClass {
  HUMIDIFIER = "humidifier",
  DEHUMIDIFIER = "dehumidifier",
}

export const HUMIDIFIER_ACTION_MODE: Record<HumidifierAction, HumidifierState> =
  {
    drying: "on",
    humidifying: "on",
    idle: "off",
    off: "off",
  };
