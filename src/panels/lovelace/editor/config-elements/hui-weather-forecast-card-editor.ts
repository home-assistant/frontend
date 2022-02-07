import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, boolean, object, optional, string, assign } from "superstruct";
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
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { UNAVAILABLE } from "../../../../data/entity";
import { WeatherEntity } from "../../../../data/weather";

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

    return html`
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

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.configValue.startsWith("show_")) {
        this._config = { ...this._config };
        if (target.configValue === "show_both") {
          /* delete since true is default */
          delete this._config.show_current;
          delete this._config.show_forecast;
        } else if (target.configValue === "show_current") {
          delete this._config.show_current;
          this._config.show_forecast = false;
        } else if (target.configValue === "show_forecast") {
          delete this._config.show_forecast;
          this._config.show_current = false;
        }
      } else if (target.value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue!]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card-editor": HuiWeatherForecastCardEditor;
  }
}
