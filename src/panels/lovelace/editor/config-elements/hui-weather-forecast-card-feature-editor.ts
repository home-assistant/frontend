import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type {
  ForecastType,
  ModernForecastType,
  WeatherEntity,
} from "../../../../data/weather";
import { WeatherEntityFeature } from "../../../../data/weather";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_FORECAST_SLOTS } from "../../card-features/hui-weather-forecast-card-feature";
import type {
  LovelaceCardFeatureContext,
  WeatherForecastCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-weather-forecast-card-feature-editor")
export class HuiWeatherForecastCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: WeatherForecastCardFeatureConfig;

  public setConfig(config: WeatherForecastCardFeatureConfig): void {
    this._config = config;
  }

  private get _stateObj(): WeatherEntity | undefined {
    if (!this.hass || !this.context?.entity_id) {
      return undefined;
    }

    return this.hass.states[this.context.entity_id] as
      | WeatherEntity
      | undefined;
  }

  private _forecastSupported(forecastType: ForecastType): boolean {
    const stateObj = this._stateObj;
    if (!stateObj) {
      return false;
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

  private get _defaultForecastType(): ModernForecastType | undefined {
    if (this._forecastSupported("daily")) {
      return "daily";
    }
    if (this._forecastSupported("hourly")) {
      return "hourly";
    }
    if (this._forecastSupported("twice_daily")) {
      return "twice_daily";
    }
    return undefined;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      hasDaily: boolean,
      hasHourly: boolean,
      hasTwiceDaily: boolean
    ) => {
      const forecastTypeOptions = [
        ...(hasDaily
          ? ([
              {
                value: "daily",
                label: localize(
                  "ui.panel.lovelace.editor.features.types.weather-forecast.type_list.daily"
                ),
              },
            ] as const)
          : []),
        ...(hasHourly
          ? ([
              {
                value: "hourly",
                label: localize(
                  "ui.panel.lovelace.editor.features.types.weather-forecast.type_list.hourly"
                ),
              },
            ] as const)
          : []),
        ...(hasTwiceDaily
          ? ([
              {
                value: "twice_daily",
                label: localize(
                  "ui.panel.lovelace.editor.features.types.weather-forecast.type_list.twice_daily"
                ),
              },
            ] as const)
          : []),
      ];

      return [
        ...(forecastTypeOptions.length
          ? ([
              {
                name: "forecast_type",
                default: forecastTypeOptions[0].value,
                selector: {
                  select: {
                    options: forecastTypeOptions,
                  },
                },
              },
            ] as const)
          : []),
        {
          name: "forecast_slots",
          default: DEFAULT_FORECAST_SLOTS,
          selector: {
            number: {
              min: 1,
              max: 12,
              mode: "slider",
            },
          },
        },
        {
          name: "round_temperature",
          selector: { boolean: {} },
        },
      ] as const;
    }
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const defaultForecastType = this._defaultForecastType;

    const schema = this._schema(
      this.hass.localize,
      this._forecastSupported("daily"),
      this._forecastSupported("hourly"),
      this._forecastSupported("twice_daily")
    );

    const data: WeatherForecastCardFeatureConfig = {
      forecast_slots: this._config.forecast_slots ?? DEFAULT_FORECAST_SLOTS,
      ...this._config,
      forecast_type: this._config.forecast_type ?? defaultForecastType,
      type: "weather-forecast",
    };

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
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.weather-forecast.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card-feature-editor": HuiWeatherForecastCardFeatureEditor;
  }
}
