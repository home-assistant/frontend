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

export function computeHumidifierStateDisplay(
  stateObj: FanEntity,
  locale: FrontendLocaleData,
  speed?: number
) {
  const percentage = stateActive(stateObj)
    ? stateObj.attributes.percentage
    : undefined;
  const currentSpeed = speed ?? percentage;

  return currentSpeed
    ? `${Math.floor(currentSpeed)}${blankBeforePercent(locale)}%`
    : "";
}
