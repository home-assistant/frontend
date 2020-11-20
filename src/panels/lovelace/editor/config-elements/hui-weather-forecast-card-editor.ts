import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-attribute-picker";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-formfield";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { WeatherForecastCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import "../hui-config-element-template";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  entity: optional(string()),
  name: optional(string()),
  theme: optional(string()),
  show_forecast: optional(boolean()),
  secondary_info_attribute: optional(string()),
});

const includeDomains = ["weather"];

@customElement("hui-weather-forecast-card-editor")
export class HuiWeatherForecastCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: WeatherForecastCardConfig;

  public setConfig(config: WeatherForecastCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
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

  get _show_forecast(): boolean {
    return this._config!.show_forecast || true;
  }

  get _secondary_info_attribute(): string {
    return this._config!.secondary_info_attribute || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <hui-config-element-template
        .hass=${this.hass}
        .isAdvanced=${this.isAdvanced}
      >
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
          <paper-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )}
            .value=${this._name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <ha-settings-row three-line>
            <span slot="heading">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.weather-forecast.show_forecast"
              )}
            </span>
            <ha-switch
              .checked=${this._config!.show_forecast !== false}
              .configValue=${"show_forecast"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-settings-row>
        </div>
        <div slot="advanced" class="card-config">
          <ha-entity-attribute-picker
            .hass=${this.hass}
            .entityId=${this._entity}
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.secondary_info_attribute"
            )}
            .value=${this._secondary_info_attribute}
            .configValue=${"secondary_info_attribute"}
            @value-changed=${this._valueChanged}
          ></ha-entity-attribute-picker>
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>
      </hui-config-element-template>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
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

  static get styles(): CSSResult {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weather-forecast-card-editor": HuiWeatherForecastCardEditor;
  }
}
