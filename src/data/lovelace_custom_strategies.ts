import type { LovelaceStrategyConfigType } from "../panels/lovelace/strategies/get-strategy";

export interface CustomStrategyEntry {
  type: string;
  name?: string;
  description?: string;
  documentationURL?: string;
  /**
   * Preview shown in the new dashboard dialog, one variant per theme mode.
   * Should be a 160x160 image, like the built-in strategy previews.
   */
  images?: { light: string; dark: string };
  strategyType: LovelaceStrategyConfigType;
}

export interface CustomStrategiesWindow {
  customStrategies?: CustomStrategyEntry[];
}

const customStrategiesWindow = window as CustomStrategiesWindow;

if (!("customStrategies" in customStrategiesWindow)) {
  customStrategiesWindow.customStrategies = [];
}

export const customStrategies = customStrategiesWindow.customStrategies!;

export const getCustomStrategiesForType = (
  strategyType: LovelaceStrategyConfigType
) => customStrategies.filter((s) => s.strategyType === strategyType);

export const getCustomStrategyEntry = (
  type: string,
  strategyType: LovelaceStrategyConfigType
) =>
  customStrategies.find(
    (s) => s.type === type && s.strategyType === strategyType
  );
