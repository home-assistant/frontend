import { mdiThermometer, mdiWeatherRainy } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_HOURS_TO_SHOW } from "../../card-features/hui-hourly-forecast-card-feature";
import type {
  HourlyForecastCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-hourly-forecast-card-feature-editor")
export class HuiHourlyForecastCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: HourlyForecastCardFeatureConfig;

  public setConfig(config: HourlyForecastCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      showTemperature: boolean,
      showPrecipitation: boolean,
      localize: HomeAssistant["localize"]
    ) =>
      [
        {
          name: "hours_to_show",
          default: DEFAULT_HOURS_TO_SHOW,
          selector: { number: { min: 1, mode: "box" } },
        },
        {
          name: "temperature",
          type: "expandable",
          flatten: true,
          expanded: true,
          iconPath: mdiThermometer,
          schema: [
            {
              name: "show_temperature",
              selector: { boolean: {} },
            },
            {
              name: "color",
              disabled: !showTemperature,
              selector: {
                ui_color: {
                  default_color: "state",
                  include_state: true,
                },
              },
            },
          ],
        },
        {
          name: "precipitation",
          type: "expandable",
          flatten: true,
          expanded: true,
          iconPath: mdiWeatherRainy,
          schema: [
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
                        "ui.panel.lovelace.editor.features.types.hourly-forecast.precipitation_type_options.amount"
                      ),
                    },
                    {
                      value: "probability",
                      label: localize(
                        "ui.panel.lovelace.editor.features.types.hourly-forecast.precipitation_type_options.probability"
                      ),
                    },
                  ],
                },
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const showTemperature = this._config.show_temperature ?? true;
    const showPrecipitation = this._config.show_precipitation ?? false;

    const data: HourlyForecastCardFeatureConfig = {
      ...this._config,
      hours_to_show: this._config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW,
      show_temperature: showTemperature,
      precipitation_type: this._config.precipitation_type ?? "amount",
    };

    const schema = this._schema(
      showTemperature,
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
      case "hours_to_show":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
      case "show_temperature":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.hourly-forecast.show_temperature"
        );
      case "show_precipitation":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.hourly-forecast.show_precipitation"
        );
      case "precipitation_type":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.hourly-forecast.precipitation_type"
        );
      case "color":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.hourly-forecast.color"
        );
      case "temperature":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.hourly-forecast.temperature"
        );
      case "precipitation":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.hourly-forecast.precipitation"
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-hourly-forecast-card-feature-editor": HuiHourlyForecastCardFeatureEditor;
  }
}
