import "@polymer/paper-input/paper-input";
import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-formfield";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { GaugeCardConfig, SeverityConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import "../hui-config-element-template";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  name: optional(string()),
  entity: optional(string()),
  unit: optional(string()),
  min: optional(number()),
  max: optional(number()),
  severity: optional(object()),
  theme: optional(string()),
});

const includeDomains = ["sensor"];

@customElement("hui-gauge-card-editor")
export class HuiGaugeCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: GaugeCardConfig;

  public setConfig(config: GaugeCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _unit(): string {
    return this._config!.unit || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  get _min(): number {
    return this._config!.min || 0;
  }

  get _max(): number {
    return this._config!.max || 100;
  }

  get _severity(): SeverityConfig | undefined {
    return this._config!.severity || undefined;
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
            allow-custom-entity
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
          ></ha-entity-picker>
          <paper-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )}
            .value=${this._name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <div class="side-by-side">
            <paper-input
              type="number"
              .label="${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.minimum"
              )} (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})"
              .value=${this._min}
              .configValue=${"min"}
              @value-changed=${this._valueChanged}
            ></paper-input>
            <paper-input
              type="number"
              .label="${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.maximum"
              )} (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})"
              .value=${this._max}
              .configValue=${"max"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          </div>
        </div>
        <div slot="advanced" class="card-config">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.unit"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._unit}
            .configValue=${"unit"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <ha-settings-row three-line>
            <span slot="heading">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.gauge.severity.define"
              )}
            </span>
            <ha-switch
              .checked=${this._config!.severity !== undefined}
              @change=${this._toggleSeverity}
            ></ha-switch>
          </ha-settings-row>
          ${this._config!.severity !== undefined
            ? html`
                <div class="side-by-side">
                  <paper-input
                    type="number"
                    .label="${this.hass.localize(
                      "ui.panel.lovelace.editor.card.gauge.severity.green"
                    )} (${this.hass.localize(
                      "ui.panel.lovelace.editor.card.config.required"
                    )})"
                    .value=${this._severity ? this._severity.green : 0}
                    .configValue=${"green"}
                    @value-changed=${this._severityChanged}
                  ></paper-input>
                  <paper-input
                    type="number"
                    .label="${this.hass.localize(
                      "ui.panel.lovelace.editor.card.gauge.severity.yellow"
                    )} (${this.hass.localize(
                      "ui.panel.lovelace.editor.card.config.required"
                    )})"
                    .value=${this._severity ? this._severity.yellow : 0}
                    .configValue=${"yellow"}
                    @value-changed=${this._severityChanged}
                  ></paper-input>
                  <paper-input
                    type="number"
                    .label="${this.hass.localize(
                      "ui.panel.lovelace.editor.card.gauge.severity.red"
                    )} (${this.hass.localize(
                      "ui.panel.lovelace.editor.card.config.required"
                    )})"
                    .value=${this._severity ? this._severity.red : 0}
                    .configValue=${"red"}
                    @value-changed=${this._severityChanged}
                  ></paper-input>
                </div>
              `
            : ""}
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

  static get styles(): CSSResult {
    return configElementStyle;
  }

  private _toggleSeverity(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    if ((ev.target as EditorTarget).checked) {
      this._config = {
        ...this._config,
        severity: {
          green: 0,
          yellow: 0,
          red: 0,
        },
      };
    } else {
      this._config = { ...this._config };
      delete this._config.severity;
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _severityChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const severity = {
      ...this._config.severity,
      [target.configValue!]: Number(target.value),
    };
    this._config = {
      ...this._config,
      severity,
    };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (target.configValue) {
      if (
        target.value === "" ||
        (target.type === "number" && isNaN(Number(target.value)))
      ) {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        let value: any = target.value;
        if (target.type === "number") {
          value = Number(value);
        }
        this._config = { ...this._config, [target.configValue!]: value };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card-editor": HuiGaugeCardEditor;
  }
}
