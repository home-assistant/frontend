import type { HassEntity } from "home-assistant-js-websocket";
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
  DEFAULT_HOURS_TO_SHOW,
  resolveForecastResolution,
} from "../../card-features/common/forecast";
import type {
  ForecastResolution,
  LovelaceCardFeatureContext,
  TemperatureForecastCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-temperature-forecast-card-feature-editor")
export class HuiTemperatureForecastCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TemperatureForecastCardFeatureConfig;

  public setConfig(config: TemperatureForecastCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      stateObj: HassEntity | undefined,
      forecastType: ForecastResolution,
      localize: HomeAssistant["localize"]
    ) => {
      const supportedTypes = stateObj
        ? getSupportedForecastTypes(stateObj)
        : [];
      const isHourly = forecastType === "hourly";
      return [
        {
          name: "forecast_type",
          required: true,
          disabled: supportedTypes.length <= 1,
          selector: {
            select: {
              mode: "dropdown",
              options: (
                ["daily", "twice_daily", "hourly"] as ForecastResolution[]
              ).map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.temperature-forecast.forecast_type_options.${value}`
                ),
                disabled: !supportedTypes.includes(value),
              })),
            },
          },
        },
        isHourly
          ? {
              name: "hours_to_show",
              default: DEFAULT_HOURS_TO_SHOW,
              selector: { number: { min: 1, mode: "box" } },
            }
          : {
              name: "days_to_show",
              default: DEFAULT_DAYS_TO_SHOW,
              selector: { number: { min: 1, mode: "box" } },
            },
        {
          name: "color",
          selector: {
            ui_color: {
              default_color: "state",
              include_state: true,
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[];
    }
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context.entity_id]
      : undefined;
    const resolvedType =
      resolveForecastResolution(stateObj, this._config.forecast_type) ||
      "daily";
    const isHourly = resolvedType === "hourly";

    const data: TemperatureForecastCardFeatureConfig = {
      ...this._config,
      forecast_type: resolvedType,
      ...(isHourly
        ? { hours_to_show: this._config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW }
        : { days_to_show: this._config.days_to_show ?? DEFAULT_DAYS_TO_SHOW }),
    };

    const schema = this._schema(stateObj, resolvedType, this.hass.localize);

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
          "ui.panel.lovelace.editor.features.types.temperature-forecast.forecast_type"
        );
      case "days_to_show":
      case "hours_to_show":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
      case "color":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.temperature-forecast.color"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-temperature-forecast-card-feature-editor": HuiTemperatureForecastCardFeatureEditor;
  }
}
