import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { WeatherEntityFeature } from "../../../../src/data/weather";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { mockWeatherForecasts } from "../../../../src/fake_data/weather";
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
];

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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-weather-page-cards": DemoWeatherPageCards;
  }
}
