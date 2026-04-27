import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { getSupportedForecastTypes } from "../../../../data/weather";
import type { HomeAssistant } from "../../../../types";
import {
  DEFAULT_DAYS_TO_SHOW,
  resolveDailyForecastType,
} from "../../card-features/hui-daily-forecast-card-feature";
import type {
  DailyForecastCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-daily-forecast-card-feature-editor")
export class HuiDailyForecastCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: DailyForecastCardFeatureConfig;

  public setConfig(config: DailyForecastCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      supportsDaily: boolean,
      supportsTwiceDaily: boolean,
      showPrecipitation: boolean,
      localize: HomeAssistant["localize"]
    ) =>
      [
        {
          name: "forecast_type",
          required: true,
          disabled: !(supportsDaily && supportsTwiceDaily),
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "daily",
                  label: localize(
                    "ui.panel.lovelace.editor.features.types.daily-forecast.forecast_type_options.daily"
                  ),
                  disabled: !supportsDaily,
                },
                {
                  value: "twice_daily",
                  label: localize(
                    "ui.panel.lovelace.editor.features.types.daily-forecast.forecast_type_options.twice_daily"
                  ),
                  disabled: !supportsTwiceDaily,
                },
              ],
            },
          },
        },
        {
          name: "days_to_show",
          default: DEFAULT_DAYS_TO_SHOW,
          selector: { number: { min: 1, mode: "box" } },
        },
        {
          name: "show_temperature",
          selector: { boolean: {} },
        },
        {
          name: "show_precipitation",
          selector: { boolean: {} },
        },
        {
          name: "precipitation_type",
          required: true,
          disabled: !showPrecipitation,
          selector: {
            select: {
              mode: "dropdown",
              options: [
                {
                  value: "amount",
                  label: localize(
                    "ui.panel.lovelace.editor.features.types.daily-forecast.precipitation_type_options.amount"
                  ),
                },
                {
                  value: "probability",
                  label: localize(
                    "ui.panel.lovelace.editor.features.types.daily-forecast.precipitation_type_options.probability"
                  ),
                },
              ],
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context.entity_id]
      : undefined;
    const supportedTypes = stateObj ? getSupportedForecastTypes(stateObj) : [];
    const supportsDaily = supportedTypes.includes("daily");
    const supportsTwiceDaily = supportedTypes.includes("twice_daily");

    const resolvedType =
      resolveDailyForecastType(stateObj, this._config.forecast_type) || "daily";

    const showPrecipitation = this._config.show_precipitation ?? false;

    const data: DailyForecastCardFeatureConfig = {
      ...this._config,
      forecast_type: resolvedType,
      days_to_show: this._config.days_to_show ?? DEFAULT_DAYS_TO_SHOW,
      show_temperature: this._config.show_temperature ?? true,
      precipitation_type: this._config.precipitation_type ?? "amount",
    };

    const schema = this._schema(
      supportsDaily,
      supportsTwiceDaily,
      showPrecipitation,
      this.hass.localize
    );

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
  ) => {
    switch (schema.name) {
      case "forecast_type":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.daily-forecast.forecast_type"
        );
      case "days_to_show":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
      case "show_temperature":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.daily-forecast.show_temperature"
        );
      case "show_precipitation":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.daily-forecast.show_precipitation"
        );
      case "precipitation_type":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.daily-forecast.precipitation_type"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-daily-forecast-card-feature-editor": HuiDailyForecastCardFeatureEditor;
  }
}
