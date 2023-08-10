import {
  mdiFinance,
  mdiFireCircle,
  mdiHeatWave,
  mdiLeaf,
  mdiLightningBolt,
  mdiPower,
  mdiRocketLaunch,
} from "@mdi/js";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const enum WaterHeaterEntityFeature {
  TARGET_TEMPERATURE = 1,
  OPERATION_MODE = 2,
  AWAY_MODE = 4,
}

export type OperationMode =
  | "eco"
  | "electric"
  | "performance"
  | "high_demand"
  | "heat_pump"
  | "gas"
  | "off";

export type WaterHeaterEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    target_temp_step?: number;
    min_temp: number;
    max_temp: number;
    current_temperature?: number;
    temperature?: number;
    operation_mode: OperationMode;
    operation_list: OperationMode[];
    away_mode?: "on" | "off";
  };
};

const hvacModeOrdering: { [key in OperationMode]: number } = {
  eco: 1,
  electric: 2,
  performance: 3,
  high_demand: 4,
  heat_pump: 5,
  gas: 6,
  off: 7,
};

export const compareWaterHeaterOperationMode = (
  mode1: OperationMode,
  mode2: OperationMode
) => hvacModeOrdering[mode1] - hvacModeOrdering[mode2];

export const WATER_HEATER_OPERATION_MODE_ICONS: Record<OperationMode, string> =
  {
    eco: mdiLeaf,
    electric: mdiLightningBolt,
    performance: mdiRocketLaunch,
    high_demand: mdiFinance,
    heat_pump: mdiHeatWave,
    gas: mdiFireCircle,
    off: mdiPower,
  };

export const computeOperationModeIcon = (mode: OperationMode) =>
  WATER_HEATER_OPERATION_MODE_ICONS[mode];
