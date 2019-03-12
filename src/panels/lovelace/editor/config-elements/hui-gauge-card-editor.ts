import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-toggle-button/paper-toggle-button";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config, SeverityConfig } from "../../cards/hui-gauge-card";
import { configElementStyle } from "./config-elements-style";

import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";

const cardConfigStruct = struct({
  type: "string",
  name: "string?",
  entity: "string?",
  unit: "string?",
  min: "number?",
  max: "number?",
  severity: "object?",
  theme: "string?",
});

@customElement("hui-gauge-card-editor")
export class HuiGaugeCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: Config;

  private _useSeverity?: boolean;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);
    this._useSeverity = !!config.severity;
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
    return this._config!.theme || "default";
  }

  get _min(): number {
    return this._config!.number || 0;
  }

  get _max(): number {
    return this._config!.max || 100;
  }

  get _severity(): SeverityConfig | undefined {
    return this._config!.severity || undefined;
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <div class="side-by-side">
          <paper-input
            label="Name"
            .value="${this._name}"
            .configValue=${"name"}
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this._entity}"
            .configValue=${"entity"}
            domain-filter="sensor"
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
        </div>
        <div class="side-by-side">
          <paper-input
            label="Unit"
            .value="${this._unit}"
            .configValue=${"unit"}
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <hui-theme-select-editor
            .hass="${this.hass}"
            .value="${this._theme}"
            .configValue="${"theme"}"
            @theme-changed="${this._valueChanged}"
          ></hui-theme-select-editor>
        </div>
        <div class="side-by-side">
          <paper-input
            type="number"
            label="Minimum"
            .value="${this._min}"
            .configValue=${"min"}
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
            type="number"
            label="Maximum"
            .value="${this._max}"
            .configValue=${"max"}
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <div class="side-by-side">
          <paper-toggle-button
            ?checked="${this._useSeverity !== false}"
            @change="${this._toggleSeverity}"
            >Define Severity?</paper-toggle-button
          >
          <div class="severity">
            <paper-input
              type="number"
              label="Green"
              .value="${this._severity ? this._severity.green : 0}"
              .configValue=${"green"}
              @value-changed="${this._severityChanged}"
            ></paper-input>
            <paper-input
              type="number"
              label="Yellow"
              .value="${this._severity ? this._severity.yellow : 0}"
              .configValue=${"yellow"}
              @value-changed="${this._severityChanged}"
            ></paper-input>
            <paper-input
              type="number"
              label="Red"
              .value="${this._severity ? this._severity.red : 0}"
              .configValue=${"red"}
              @value-changed="${this._severityChanged}"
            ></paper-input>
          </div>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .severity {
        display: none;
        width: 100%;
        padding-left: 16px;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .severity > * {
        flex: 1 0 30%;
        padding-right: 4px;
      }
      paper-toggle-button[checked] ~ .severity {
        display: flex;
      }
    `;
  }

  private _toggleSeverity(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    this._config.severity = target.checked
      ? {
          green: 0,
          yellow: 0,
          red: 0,
        }
      : undefined;
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
