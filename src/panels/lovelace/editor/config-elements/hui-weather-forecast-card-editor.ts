import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, boolean, object, optional, string, assign } from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/entity/ha-entity-attribute-picker";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import { HomeAssistant } from "../../../../types";
import { WeatherForecastCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { UNAVAILABLE } from "../../../../data/entity";
import { WeatherEntity } from "../../../../data/weather";
import { HaFormSchema } from "../../../../components/ha-form/types";

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

const includeDomains = ["weather"];

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

  private _schema = memoizeOne(
    (entity: string, hasForecast: boolean): HaFormSchema[] => [
      {
        name: "entity",
        required: true,
        selector: { entity: { domain: "weather" } },
      },
      { name: "name", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          {
            name: "attribute",
            selector: { attribute: { entity_id: entity } },
          },
          { name: "theme", selector: { theme: {} } },
        ],
      },
      { name: "Forecast", type: "select", disabled: !hasForecast, options: [] },
    ]
  );

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  get _show_current(): boolean {
    return this._config!.show_current ?? true;
  }

  get _show_forecast(): boolean {
    return this._config!.show_forecast ?? this._has_forecast === true;
  }

  get _secondary_info_attribute(): string {
    return this._config!.secondary_info_attribute || "";
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

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as WeatherEntity;

    const data = { ...this._config };
    const schema = this._schema(
      stateObj?.state !== UNAVAILABLE && !!stateObj.attributes.forecast?.length
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          .includeDomains=${includeDomains}
          @change=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
          <ha-entity-attribute-picker
            .hass=${this.hass}
            .entityId=${this._entity}
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.secondary_info_attribute"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._secondary_info_attribute}
            .configValue=${"secondary_info_attribute"}
            @value-changed=${this._valueChanged}
          ></ha-entity-attribute-picker>
        </div>
        <div class="side-by-side">
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.weather-forecast.show_both"
            )}
            .dir=${computeRTLDirection(this.hass)}
          >
            <ha-radio
              .disabled=${this._has_forecast === false}
              .checked=${this._has_forecast === true &&
              this._show_current &&
              this._show_forecast}
              .configValue=${"show_both"}
              @change=${this._valueChanged}
            ></ha-radio
          ></ha-formfield>
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.weather-forecast.show_only_current"
            )}
            .dir=${computeRTLDirection(this.hass)}
          >
            <ha-radio
              .disabled=${this._has_forecast === false}
              .checked=${this._has_forecast === false ||
              (this._show_current && !this._show_forecast)}
              .configValue=${"show_current"}
              @change=${this._valueChanged}
            ></ha-radio
          ></ha-formfield>
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.weather-forecast.show_only_forecast"
            )}
            .dir=${computeRTLDirection(this.hass)}
          >
            <ha-radio
              .disabled=${this._has_forecast === false}
              .checked=${this._has_forecast === true &&
              !this._show_current &&
              this._show_forecast}
              .configValue=${"show_forecast"}
              @change=${this._valueChanged}
            ></ha-radio
          ></ha-formfield>
        </div>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;

    if (config.forecast === "show_both") {
      /* delete since true is default */
      delete config.show_current;
      delete config.show_forecast;
    } else if (config.forecast === "show_current") {
      delete config.show_current;
      config.show_forecast = false;
    } else if (config.forecast === "show_forecast") {
      delete config.show_forecast;
      config.show_current = false;
    }

    delete config.forecast;

    Object.keys(config).forEach((k) => config[k] === "" && delete config[k]);
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    if (schema.name === "entity") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.entity"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.required"
      )})`;
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card-editor": HuiWeatherForecastCardEditor;
  }
}
