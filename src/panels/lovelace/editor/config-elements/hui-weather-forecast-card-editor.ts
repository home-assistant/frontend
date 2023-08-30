import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { UNAVAILABLE } from "../../../../data/entity";
import type { ForecastType, WeatherEntity } from "../../../../data/weather";
import { WeatherEntityFeature } from "../../../../data/weather";
import type { HomeAssistant } from "../../../../types";
import type { WeatherForecastCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { supportsFeature } from "../../../../common/entity/supports-feature";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    theme: optional(string()),
    show_current: optional(boolean()),
    show_forecast: optional(boolean()),
    forecast_type: optional(string()),
    secondary_info_attribute: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-weather-forecast-card-editor")
export class HuiWeatherForecastCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WeatherForecastCardConfig;

  public setConfig(config: WeatherForecastCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;

    if (
      /* cannot show forecast in case it is unavailable on the entity */
      (config.show_forecast === true && this._hasForecast === false) ||
      /* cannot hide both weather and forecast, need one of them */
      (config.show_current === false && config.show_forecast === false)
    ) {
      /* reset to sane default, show weather, but hide forecast */
      fireEvent(this, "config-changed", {
        config: { ...config, show_current: true, show_forecast: false },
      });
    }
    if (
      !config.forecast_type ||
      (config.forecast_type === "legacy" && this._modernForecastSupported()) ||
      !this._forecastSupported(config.forecast_type)
    ) {
      let forecastType: string | undefined;
      if (this._forecastSupported("daily")) {
        forecastType = "daily";
      } else if (this._forecastSupported("hourly")) {
        forecastType = "hourly";
      } else if (this._forecastSupported("twice_daily")) {
        forecastType = "twice_daily";
      } else if (this._forecastSupported("legacy")) {
        forecastType = "legacy";
      }
      fireEvent(this, "config-changed", {
        config: { ...config, forecast_type: forecastType },
      });
    }
  }

  private get _stateObj(): WeatherEntity | undefined {
    if (this.hass && this._config) {
      return this.hass.states[this._config.entity] as WeatherEntity;
    }
    return undefined;
  }

  private get _hasForecast(): boolean | undefined {
    const stateObj = this._stateObj as WeatherEntity;
    if (stateObj && stateObj.state !== UNAVAILABLE) {
      return !!(
        stateObj.attributes.forecast?.length ||
        stateObj.attributes.supported_features
      );
    }
    return undefined;
  }

  private _forecastSupported(forecastType: ForecastType): boolean {
    const stateObj = this._stateObj as WeatherEntity;
    if (forecastType === "legacy") {
      return !!stateObj.attributes.forecast?.length;
    }
    if (forecastType === "daily") {
      return supportsFeature(stateObj, WeatherEntityFeature.FORECAST_DAILY);
    }
    if (forecastType === "hourly") {
      return supportsFeature(stateObj, WeatherEntityFeature.FORECAST_HOURLY);
    }
    if (forecastType === "twice_daily") {
      return supportsFeature(
        stateObj,
        WeatherEntityFeature.FORECAST_TWICE_DAILY
      );
    }
    return false;
  }

  private _modernForecastSupported(): boolean {
    return (
      this._forecastSupported("daily") ||
      this._forecastSupported("hourly") ||
      this._forecastSupported("twice_daily")
    );
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      hasForecastLegacy?: boolean,
      hasForecastDaily?: boolean,
      hasForecastHourly?: boolean,
      hasForecastTwiceDaily?: boolean
    ) =>
      [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "weather" } },
        },
        { name: "name", selector: { text: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "secondary_info_attribute",
              selector: { attribute: {} },
              context: { filter_entity: "entity" },
            },
            { name: "theme", selector: { theme: {} } },
          ],
        },
        ...(hasForecastDaily || hasForecastHourly || hasForecastTwiceDaily
          ? ([
              {
                name: "forecast_type",
                selector: {
                  select: {
                    options: [
                      ...(hasForecastDaily
                        ? ([
                            {
                              value: "daily",
                              label: localize(
                                "ui.panel.lovelace.editor.card.weather-forecast.daily"
                              ),
                            },
                          ] as const)
                        : []),
                      ...(hasForecastHourly
                        ? ([
                            {
                              value: "hourly",
                              label: localize(
                                "ui.panel.lovelace.editor.card.weather-forecast.hourly"
                              ),
                            },
                          ] as const)
                        : []),
                      ...(hasForecastTwiceDaily
                        ? ([
                            {
                              value: "twice_daily",
                              label: localize(
                                "ui.panel.lovelace.editor.card.weather-forecast.twice_daily"
                              ),
                            },
                          ] as const)
                        : []),
                    ],
                  },
                },
              },
            ] as const)
          : []),
        ...(hasForecastDaily ||
        hasForecastHourly ||
        hasForecastTwiceDaily ||
        hasForecastLegacy
          ? ([
              {
                name: "forecast",
                selector: {
                  select: {
                    options: [
                      {
                        value: "show_both",
                        label: localize(
                          "ui.panel.lovelace.editor.card.weather-forecast.show_both"
                        ),
                      },
                      {
                        value: "show_current",
                        label: localize(
                          "ui.panel.lovelace.editor.card.weather-forecast.show_only_current"
                        ),
                      },
                      {
                        value: "show_forecast",
                        label: localize(
                          "ui.panel.lovelace.editor.card.weather-forecast.show_only_forecast"
                        ),
                      },
                    ],
                  },
                },
              },
            ] as const)
          : []),
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(
      this.hass.localize,
      this._forecastSupported("legacy"),
      this._forecastSupported("daily"),
      this._forecastSupported("hourly"),
      this._forecastSupported("twice_daily")
    );

    const data: WeatherForecastCardConfig = {
      show_current: true,
      show_forecast: this._hasForecast,
      ...this._config,
    };

    data.forecast =
      data.show_current && data.show_forecast
        ? "show_both"
        : data.show_current
        ? "show_current"
        : "show_forecast";

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    if (config.forecast === "show_both") {
      config.show_current = true;
      config.show_forecast = true;
    } else if (config.forecast === "show_current") {
      config.show_current = true;
      config.show_forecast = false;
    } else {
      config.show_current = false;
      config.show_forecast = true;
    }

    delete config.forecast;
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "entity":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.required"
        )})`;
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "forecast_type":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.weather-forecast.forecast_type"
        );
      case "forecast":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.weather-forecast.weather_to_show"
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card-editor": HuiWeatherForecastCardEditor;
  }
}
