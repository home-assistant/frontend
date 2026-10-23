import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { WeatherEntityFeature } from "../../../../src/data/weather";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import {
  mockWeatherForecasts,
  mockWeatherHistory,
} from "../../../../src/fake_data/weather";
import type { DemoCardConfig } from "../../components/demo-card";
import "../../components/demo-cards";

const SOURCES = ["weather.home"];

const ENTITIES = [
  {
    entity_id: "weather.home",
    state: "rainy",
    attributes: {
      friendly_name: "Home",
      temperature: 15,
      apparent_temperature: 14,
      dew_point: 12,
      humidity: 82,
      pressure: 1008,
      wind_speed: 14,
      wind_gust_speed: 32,
      wind_bearing: 225,
      visibility: 16,
      uv_index: 4,
      temperature_unit: "°C",
      pressure_unit: "hPa",
      wind_speed_unit: "km/h",
      visibility_unit: "km",
      precipitation_unit: "mm",
      supported_features:
        WeatherEntityFeature.FORECAST_DAILY +
        WeatherEntityFeature.FORECAST_HOURLY,
    },
  },
  {
    entity_id: "sensor.rain_gauge",
    state: "12.4",
    attributes: {
      friendly_name: "Rain gauge",
      device_class: "precipitation",
      state_class: "total_increasing",
      unit_of_measurement: "mm",
    },
  },
  {
    entity_id: "sensor.home_pm2_5",
    state: "8",
    attributes: {
      friendly_name: "PM2.5",
      device_class: "pm25",
      unit_of_measurement: "µg/m³",
    },
  },
  {
    entity_id: "sensor.home_nitrogen_dioxide",
    state: "12",
    attributes: {
      friendly_name: "Nitrogen dioxide",
      device_class: "nitrogen_dioxide",
      unit_of_measurement: "µg/m³",
    },
  },
  {
    entity_id: "sensor.home_grass_pollen",
    state: "Moderate",
    attributes: {
      friendly_name: "Grass pollen",
    },
  },
];

const metric = (heading: string, config: Record<string, unknown>) => ({
  heading,
  config: { type: "weather-metric", entities: SOURCES, ...config },
});

const CONFIGS: DemoCardConfig[] = [
  {
    heading: "Current conditions",
    config: { type: "weather-current", entities: SOURCES },
  },
  {
    heading: "Next hours",
    config: { type: "weather-hourly", entities: SOURCES },
  },
  {
    heading: "Daily forecast",
    config: { type: "weather-daily", entities: SOURCES },
  },
  { heading: "Sun", config: { type: "weather-sun" } },
  { heading: "Moon", config: { type: "weather-moon" } },
  {
    heading: "Wind",
    config: { type: "weather-wind", entities: SOURCES },
  },
  metric("Compared to average", { metric: "compared_to_average" }),
  metric("UV index", { metric: "uv_index" }),
  metric("Humidity", { metric: "humidity" }),
  metric("Pressure", { metric: "pressure" }),
  metric("Precipitation (rain gauge)", {
    metric: "precipitation",
    entity: "sensor.rain_gauge",
  }),
  metric("Visibility", { metric: "visibility" }),
  {
    heading: "Air quality and pollen",
    config: {
      type: "weather-air-quality",
      air_quality_entities: [
        "sensor.home_pm2_5",
        "sensor.home_nitrogen_dioxide",
      ],
      pollen_entities: ["sensor.home_grass_pollen"],
    },
  },
];

@customElement("demo-lovelace-weather-page-cards")
class DemoWeatherPageCards extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateHass({
      language: "en",
      locale: { ...hass.locale, language: "en" },
      config: { ...hass.config, latitude: 52.09, longitude: 5.12 },
    });
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
    mockIcons(hass);
    mockWeatherForecasts(hass);
    mockWeatherHistory(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-weather-page-cards": DemoWeatherPageCards;
  }
}
