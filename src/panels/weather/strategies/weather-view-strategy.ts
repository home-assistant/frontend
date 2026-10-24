import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { WeatherFrontendSystemData } from "../../../data/frontend";
import { fetchFrontendSystemData } from "../../../data/frontend";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import {
  findMoonEntity,
  getAirQualityEntities,
  getForecastSource,
  getIntegrationCategories,
  getPollenEntities,
  getPrimaryWeatherEntity,
  getRainGauge,
  getWeatherSources,
  getWeatherValue,
} from "../../../data/weather_page";
import type { HomeAssistant } from "../../../types";
import type {
  WeatherAirQualityCardConfig,
  WeatherDailyCardConfig,
  WeatherHourlyCardConfig,
  WeatherMetric,
  WeatherMetricCardConfig,
  WeatherMoonCardConfig,
  WeatherPageCardConfig,
} from "../../lovelace/cards/types";

export interface WeatherViewStrategyConfig {
  type: "weather";
  // Settings of the weather page. When left out (for example when this
  // strategy is used in a dashboard), the saved weather page settings are used.
  settings?: WeatherFrontendSystemData;
}

const EMPTY_STATE: LovelaceViewConfig = {
  type: "panel",
  cards: [],
};

@customElement("weather-view-strategy")
export class WeatherViewStrategy extends ReactiveElement {
  static async generate(
    config: WeatherViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    if (!isComponentLoaded(hass.config, "weather")) {
      return EMPTY_STATE;
    }

    const settings =
      config.settings ??
      (await fetchFrontendSystemData(hass.connection, "weather").catch(
        () => null
      )) ??
      {};

    const entities = getWeatherSources(hass, settings);
    if (!getPrimaryWeatherEntity(hass, entities)) {
      return EMPTY_STATE;
    }

    const categories = await getIntegrationCategories(hass);
    const hasValue = (attribute: string) =>
      !!getWeatherValue(hass, entities, attribute);
    const hasHourly = !!getForecastSource(hass, entities, "hourly");
    const hasDaily = !!getForecastSource(hass, entities, "daily");

    const metric = (
      name: WeatherMetric,
      extra: Partial<WeatherMetricCardConfig> = {}
    ): WeatherMetricCardConfig => ({
      type: "weather-metric",
      metric: name,
      entities,
      grid_options: { columns: 6 },
      ...extra,
    });

    const overview: LovelaceCardConfig[] = [
      {
        type: "weather-current",
        entities,
      } satisfies WeatherPageCardConfig,
    ];
    if (hasHourly) {
      overview.push({
        type: "weather-hourly",
        entities,
      } satisfies WeatherHourlyCardConfig);
    }

    const forecast: LovelaceCardConfig[] = [];
    if (hasDaily) {
      forecast.push({
        type: "weather-daily",
        entities,
      } satisfies WeatherDailyCardConfig);
    }

    // Sun, moon and wind
    const sky: LovelaceCardConfig[] = [
      { type: "weather-sun", grid_options: { columns: "full" } },
      {
        type: "weather-moon",
        entity: findMoonEntity(hass),
        grid_options: { columns: "full" },
      } satisfies WeatherMoonCardConfig,
    ];
    if (hasValue("wind_speed")) {
      sky.push({
        type: "weather-wind",
        entities,
        grid_options: { columns: "full" },
      } satisfies WeatherPageCardConfig);
    }

    // Small tiles, two per row
    const details: LovelaceCardConfig[] = [];
    if (hasDaily && hasValue("temperature")) {
      details.push(metric("compared_to_average"));
    }
    if (hasValue("uv_index")) {
      details.push(metric("uv_index"));
    }
    if (hasValue("humidity")) {
      details.push(metric("humidity"));
    }
    if (hasValue("pressure")) {
      details.push(metric("pressure"));
    }
    const rainGauge = getRainGauge(hass, settings);
    if (rainGauge) {
      details.push(metric("precipitation", { entity: rainGauge }));
    }
    if (hasValue("visibility")) {
      details.push(metric("visibility"));
    }

    const airQualityEntities = getAirQualityEntities(
      hass,
      categories,
      settings
    );
    const pollenEntities = getPollenEntities(hass, categories, settings);
    if (airQualityEntities.length || pollenEntities.length) {
      details.push({
        type: "weather-air-quality",
        air_quality_entities: airQualityEntities,
        pollen_entities: pollenEntities,
        grid_options: { columns: "full" },
      } satisfies WeatherAirQualityCardConfig);
    }

    // Three columns on wide screens; they stack on smaller ones.
    const sections: LovelaceSectionRawConfig[] = [
      { type: "grid", column_span: 3, cards: overview },
      ...[forecast, sky, details]
        .filter((cards) => cards.length)
        .map((cards) => ({ type: "grid", cards })),
    ];

    return {
      type: "sections",
      max_columns: 3,
      sections,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "weather-view-strategy": WeatherViewStrategy;
  }
}
