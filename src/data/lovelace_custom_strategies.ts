export interface CustomStrategyEntry {
  type: string;
  name?: string;
  description?: string;
  documentationURL?: string;
}

export interface CustomStrategiesWindow {
  customDashboardStrategies?: CustomStrategyEntry[];
}

const customStrategiesWindow = window as CustomStrategiesWindow;

if (!("customDashboardStrategies" in customStrategiesWindow)) {
  customStrategiesWindow.customDashboardStrategies = [];
}

export const customDashboardStrategies =
  customStrategiesWindow.customDashboardStrategies!;

export const getCustomDashboardStrategyEntry = (type: string) =>
  customDashboardStrategies.find((strategy) => strategy.type === type);
