import type { LovelaceStrategyConfigType } from "../panels/lovelace/strategies/get-strategy";

export interface CustomStrategyEntry {
  type: string;
  name?: string;
  description?: string;
  documentationURL?: string;
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
