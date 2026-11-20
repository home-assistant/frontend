import {
  createQueryString,
  type QueryParamConfig,
  type QueryParamValues,
} from "./query-params";

export const energyEditorQueryParamConfig = {
  string: ["stat_energy_from", "stat_energy_to", "stat_consumption"],
} as const satisfies QueryParamConfig;

export type EnergyEditorQueryParams = QueryParamValues<
  typeof energyEditorQueryParamConfig
>;

export const createEnergyEditorQueryString = (
  values: EnergyEditorQueryParams
): string => createQueryString(values, energyEditorQueryParamConfig);
