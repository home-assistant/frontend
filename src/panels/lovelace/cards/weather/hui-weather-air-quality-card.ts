import { mdiAirFilter } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/weather/ha-level-scale";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity/entity";
import {
  AIR_QUALITY_LEVEL_COLORS,
  getPm25Level,
  PM25_LEVEL_LIMITS,
} from "../../../../data/weather_page";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { WeatherAirQualityCardConfig } from "../types";
import { weatherCardStyles } from "./weather-card-styles";
import { syncWeatherCardVisibility } from "./weather-page-card-base";

const PM25_SCALE_MAX = 100;
const PM25_UNIT = "µg/m³";

/**
 * Air quality and pollen. The level is based on fine particles (PM2.5) and
 * the WHO guideline, which works the same in every region. An air quality
 * index is shown as reported by its service, as the scales differ per region.
 */
@customElement("hui-weather-air-quality-card")
export class HuiWeatherAirQualityCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WeatherAirQualityCardConfig;

  public connectedWhileHidden = true;

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    syncWeatherCardVisibility(this);
  }

  public setConfig(config: WeatherAirQualityCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): LovelaceGridOptions {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }

  private _available(entityIds: string[] = []): HassEntity[] {
    return entityIds
      .map((entityId) => this.hass!.states[entityId])
      .filter(
        (stateObj) =>
          stateObj &&
          stateObj.state !== UNAVAILABLE &&
          stateObj.state !== UNKNOWN
      );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const airQuality = this._available(this._config.air_quality_entities);
    const pollen = this._available(this._config.pollen_entities);
    if (!airQuality.length && !pollen.length) {
      return nothing;
    }

    const pm25 = airQuality.find(
      (stateObj) =>
        stateObj.attributes.device_class === "pm25" &&
        stateObj.attributes.unit_of_measurement === PM25_UNIT &&
        isFinite(Number(stateObj.state))
    );
    const aqi = airQuality.find(
      (stateObj) => stateObj.attributes.device_class === "aqi"
    );
    const main = pm25 ?? aqi;
    const rows = [
      ...airQuality.filter((stateObj) => stateObj !== main),
      ...pollen,
    ];

    return html`
      <ha-card>
        <div class="header">
          <ha-svg-icon .path=${mdiAirFilter}></ha-svg-icon>
          <span>${this.hass.localize("ui.card.weather.air_quality")}</span>
        </div>
        <div class="content">
          ${main ? this._renderMain(main) : nothing}
          ${
            rows.length
              ? html`<div class="rows">
                  ${rows.map(
                    (stateObj) => html`
                      <div class="row">
                        <span class="label">
                          ${this.hass!.formatEntityName(stateObj, {
                            type: "entity",
                          })}
                        </span>
                        <span class="data">
                          ${this.hass!.formatEntityState(stateObj)}
                        </span>
                      </div>
                    `
                  )}
                </div>`
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  private _renderMain(stateObj: HassEntity) {
    const hass = this.hass!;
    const isPm25 = stateObj.attributes.device_class === "pm25";
    const value = Number(stateObj.state);
    const level = isPm25 ? getPm25Level(value) : undefined;
    const [number, ...unit] = hass
      .formatEntityStateToParts(stateObj)
      .map((part) => part.value);

    return html`
      <div class="main">
        <div class="value">
          <span class="number">${number}</span>
          <span class="unit">
            ${
              isPm25
                ? `${unit.join("").trim()} ${hass.localize(
                    "ui.card.weather.fine_particles"
                  )}`
                : hass.formatEntityName(stateObj, { type: "entity" })
            }
          </span>
        </div>
        ${
          level
            ? html`
                <div class="level">
                  <span
                    class="dot"
                    style=${styleMap({
                      "background-color": AIR_QUALITY_LEVEL_COLORS[level],
                    })}
                  ></span>
                  <span>
                    ${hass.localize(`ui.card.weather.air_quality_level.${level}`)}
                  </span>
                </div>
                <ha-level-scale
                  .label=${hass.localize("ui.card.weather.fine_particles")}
                  .min=${0}
                  .max=${PM25_SCALE_MAX}
                  .value=${value}
                  .segments=${PM25_LEVEL_LIMITS.map(([key, limit]) => ({
                    to: Math.min(limit, PM25_SCALE_MAX),
                    color: AIR_QUALITY_LEVEL_COLORS[key],
                  }))}
                ></ha-level-scale>
              `
            : nothing
        }
      </div>
    `;
  }

  static styles = [
    weatherCardStyles,
    css`
      .content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--ha-space-6);
        align-items: start;
      }
      .main {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-air-quality-card": HuiWeatherAirQualityCard;
  }
}
