import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, boolean, object, optional, string, assign } from "superstruct";
import { memoize } from "@fullcalendar/common";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type { WeatherForecastCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { UNAVAILABLE } from "../../../../data/entity";
import type { WeatherEntity } from "../../../../data/weather";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    theme: optional(string()),
    show_current: optional(boolean()),
    show_forecast: optional(boolean()),
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
      (config.show_forecast === true && this._has_forecast === false) ||
      /* cannot hide both weather and forecast, need one of them */
      (config.show_current === false && config.show_forecast === false)
    ) {
      /* reset to sane default, show weather, but hide forecast */
      fireEvent(this, "config-changed", {
        config: { ...config, show_current: true, show_forecast: false },
      });
    }
  }

  get _has_forecast(): boolean | undefined {
    if (this.hass && this._config) {
      const stateObj = this.hass.states[this._config.entity] as WeatherEntity;
      if (stateObj && stateObj.state !== UNAVAILABLE) {
        return !!stateObj.attributes.forecast?.length;
      }
    }
    return undefined;
  }

  private _schema = memoize(
    (entity: string, localize: LocalizeFunc, hasForecast?: boolean) =>
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
              selector: { attribute: { entity_id: entity } },
            },
            { name: "theme", selector: { theme: {} } },
          ],
        },
        ...(hasForecast
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

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const schema = this._schema(
      this._config.entity,
      this.hass.localize,
      this._has_forecast
    );

    const data: WeatherForecastCardConfig = {
      show_current: true,
      show_forecast: this._has_forecast,
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
