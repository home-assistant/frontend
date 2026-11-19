import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { supportsFeature } from "../common/entity/supports-feature";
import type { HomeAssistant } from "../types";
import { UNAVAILABLE, UNKNOWN } from "./entity/entity";
import type { WeatherFrontendSystemData } from "./frontend";
import type { ModernForecastType, WeatherEntity } from "./weather";
import { WeatherEntityFeature } from "./weather";

type EntityHass = Pick<HomeAssistant, "states" | "entities">;

const isAvailable = (stateObj?: HassEntity): stateObj is HassEntity =>
  !!stateObj && stateObj.state !== UNAVAILABLE && stateObj.state !== UNKNOWN;

const isUserFacing = (hass: EntityHass, entityId: string): boolean => {
  const entry = hass.entities[entityId];
  return !entry || (!entry.hidden && !entry.entity_category);
};

/**
 * All weather entities, in the order the user prefers them. Entities the user
 * has not ordered yet are added at the end, so a newly added weather service
 * shows up without extra steps.
 */
export const getWeatherSources = (
  hass: EntityHass,
  config?: WeatherFrontendSystemData
): string[] => {
  const excluded = new Set(config?.excluded_weather_entities ?? []);
  const all = Object.keys(hass.states)
    .filter(
      (entityId) =>
        computeDomain(entityId) === "weather" &&
        !excluded.has(entityId) &&
        isUserFacing(hass, entityId)
    )
    .sort();
  const ordered = (config?.weather_entities ?? []).filter(
    (entityId) => entityId in hass.states && !excluded.has(entityId)
  );
  return [...ordered, ...all.filter((entityId) => !ordered.includes(entityId))];
};

export interface WeatherValue<T = number> {
  stateObj: WeatherEntity;
  value: T;
}

/** The first source that has a value for this attribute. */
export const getWeatherValue = <T = number>(
  hass: Pick<HomeAssistant, "states">,
  sources: string[],
  attribute: string
): WeatherValue<T> | undefined => {
  for (const entityId of sources) {
    const stateObj = hass.states[entityId] as WeatherEntity | undefined;
    if (!isAvailable(stateObj)) {
      continue;
    }
    const value = stateObj.attributes[attribute];
    if (value !== undefined && value !== null && value !== "") {
      return { stateObj, value: value as T };
    }
  }
  return undefined;
};

/** The first source that is available, used for the current condition. */
export const getPrimaryWeatherEntity = (
  hass: Pick<HomeAssistant, "states">,
  sources: string[]
): WeatherEntity | undefined =>
  sources
    .map((entityId) => hass.states[entityId] as WeatherEntity | undefined)
    .find(isAvailable);

const FORECAST_FEATURES: Record<ModernForecastType, WeatherEntityFeature> = {
  daily: WeatherEntityFeature.FORECAST_DAILY,
  hourly: WeatherEntityFeature.FORECAST_HOURLY,
  twice_daily: WeatherEntityFeature.FORECAST_TWICE_DAILY,
};

/** The first source that offers this type of forecast. */
export const getForecastSource = (
  hass: Pick<HomeAssistant, "states">,
  sources: string[],
  type: ModernForecastType
): WeatherEntity | undefined =>
  sources
    .map((entityId) => hass.states[entityId] as WeatherEntity | undefined)
    .find(
      (stateObj) =>
        isAvailable(stateObj) &&
        supportsFeature(stateObj, FORECAST_FEATURES[type])
    );

// UV index levels from the World Health Organization.
export type UvLevel = "low" | "moderate" | "high" | "very_high" | "extreme";

export const UV_LEVEL_COLORS: Record<UvLevel, string> = {
  low: "var(--success-color)",
  moderate: "var(--warning-color)",
  high: "var(--orange-color)",
  very_high: "var(--error-color)",
  extreme: "var(--purple-color)",
};

export const getUvLevel = (uvIndex: number): UvLevel => {
  if (uvIndex < 3) return "low";
  if (uvIndex < 6) return "moderate";
  if (uvIndex < 8) return "high";
  if (uvIndex < 11) return "very_high";
  return "extreme";
};

// Fine particle (PM2.5) levels based on the 2021 WHO air quality guideline
// and its interim targets. These are the same everywhere, unlike the many
// regional air quality indexes.
export type AirQualityLevel =
  "good" | "fair" | "moderate" | "poor" | "very_poor" | "extremely_poor";

export const AIR_QUALITY_LEVEL_COLORS: Record<AirQualityLevel, string> = {
  good: "var(--success-color)",
  fair: "var(--lime-color)",
  moderate: "var(--warning-color)",
  poor: "var(--orange-color)",
  very_poor: "var(--error-color)",
  extremely_poor: "var(--purple-color)",
};

export const PM25_LEVEL_LIMITS: [AirQualityLevel, number][] = [
  ["good", 15],
  ["fair", 25],
  ["moderate", 37.5],
  ["poor", 50],
  ["very_poor", 75],
  ["extremely_poor", Infinity],
];

export const getPm25Level = (pm25: number): AirQualityLevel =>
  PM25_LEVEL_LIMITS.find(([, limit]) => pm25 <= limit)![0];

const WIND_SPEED_TO_MS: Record<string, number> = {
  "m/s": 1,
  "km/h": 1 / 3.6,
  mph: 0.44704,
  kn: 0.514444,
  "ft/s": 0.3048,
};

// Upper limits of Beaufort 0 to 11, in m/s
const BEAUFORT_LIMITS = [
  0.5, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7,
];

export const getBeaufort = (
  speed: number,
  unit: string | undefined
): number | undefined => {
  if (unit === "Beaufort") {
    return Math.round(speed);
  }
  const factor = unit ? WIND_SPEED_TO_MS[unit] : undefined;
  if (factor === undefined) {
    return undefined;
  }
  const metersPerSecond = speed * factor;
  const index = BEAUFORT_LIMITS.findIndex((limit) => metersPerSecond < limit);
  return index === -1 ? 12 : index;
};

const PRESSURE_TO_HPA: Record<string, number> = {
  hPa: 1,
  mbar: 1,
  kPa: 10,
  inHg: 33.8639,
  mmHg: 1.33322,
};

export const pressureToHpa = (
  value: number,
  unit: string | undefined
): number | undefined => {
  const factor = unit ? PRESSURE_TO_HPA[unit] : undefined;
  return factor === undefined ? undefined : value * factor;
};
