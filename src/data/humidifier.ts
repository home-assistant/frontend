import {
  mdiAccountArrowRight,
  mdiArrowDownBold,
  mdiArrowUpBold,
  mdiBabyCarriage,
  mdiCircleMedium,
  mdiClockOutline,
  mdiHome,
  mdiLeaf,
  mdiPower,
  mdiPowerSleep,
  mdiRefreshAuto,
  mdiRocketLaunch,
  mdiSofa,
  mdiWaterPercent,
} from "@mdi/js";
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

type HumidifierBuiltInMode =
  | "normal"
  | "eco"
  | "away"
  | "boost"
  | "comfort"
  | "home"
  | "sleep"
  | "auto"
  | "baby";

export const HUMIDIFIER_MODE_ICONS: Record<HumidifierBuiltInMode, string> = {
  auto: mdiRefreshAuto,
  away: mdiAccountArrowRight,
  baby: mdiBabyCarriage,
  boost: mdiRocketLaunch,
  comfort: mdiSofa,
  eco: mdiLeaf,
  home: mdiHome,
  normal: mdiWaterPercent,
  sleep: mdiPowerSleep,
};

export const computeHumidiferModeIcon = (mode?: string) =>
  HUMIDIFIER_MODE_ICONS[mode as HumidifierBuiltInMode] ?? mdiCircleMedium;

export const HUMIDIFIER_ACTION_ICONS: Record<HumidifierAction, string> = {
  drying: mdiArrowDownBold,
  humidifying: mdiArrowUpBold,
  idle: mdiClockOutline,
  off: mdiPower,
};

export const HUMIDIFIER_ACTION_MODE: Record<HumidifierAction, HumidifierState> =
  {
    drying: "on",
    humidifying: "on",
    idle: "off",
    off: "off",
  };
