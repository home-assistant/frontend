import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import {
  getDefaultForecastType,
  getSupportedForecastTypes,
  WeatherEntityFeature,
} from "../../../../data/weather";
import type { ForecastResolution } from "../types";

export const DEFAULT_DAYS_TO_SHOW = 7;
export const DEFAULT_HOURS_TO_SHOW = 24;

export const MS_PER_HOUR = 60 * 60 * 1000;

export const supportsForecast = (stateObj: HassEntity | undefined): boolean => {
  if (!stateObj) return false;
  if (computeDomain(stateObj.entity_id) !== "weather") return false;
  return (
    supportsFeature(stateObj, WeatherEntityFeature.FORECAST_DAILY) ||
    supportsFeature(stateObj, WeatherEntityFeature.FORECAST_TWICE_DAILY) ||
    supportsFeature(stateObj, WeatherEntityFeature.FORECAST_HOURLY)
  );
};

export const resolveForecastResolution = (
  stateObj: HassEntity | undefined,
  configured?: ForecastResolution
): ForecastResolution | undefined => {
  if (!stateObj) return undefined;
  const supported = getSupportedForecastTypes(stateObj);
  if (configured && supported.includes(configured)) return configured;
  return getDefaultForecastType(stateObj);
};
