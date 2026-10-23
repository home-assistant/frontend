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
