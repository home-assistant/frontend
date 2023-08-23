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

export const OPERATION_MODES = [
  "electric",
  "gas",
  "heat_pump",
  "eco",
  "performance",
  "high_demand",
  "off",
] as const;

export type OperationMode = (typeof OPERATION_MODES)[number];

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

const waterHeaterOperationModeOrdering = OPERATION_MODES.reduce(
  (order, mode, index) => {
    order[mode] = index;
    return order;
  },
  {} as Record<OperationMode, number>
);

export const compareWaterHeaterOperationMode = (
  mode1: OperationMode,
  mode2: OperationMode
) =>
  waterHeaterOperationModeOrdering[mode1] -
  waterHeaterOperationModeOrdering[mode2];

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
