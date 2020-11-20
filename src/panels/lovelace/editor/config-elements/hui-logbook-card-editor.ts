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
import { array, assert, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entities-picker";
import "../../../../components/entity/ha-entity-picker";
import { HomeAssistant } from "../../../../types";
import { LogbookCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import "../hui-config-element-template";
import { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  entities: optional(array(string())),
  title: optional(string()),
  hours_to_show: optional(number()),
  theme: optional(string()),
});

@customElement("hui-logbook-card-editor")
export class HuiLogbookCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: LogbookCardConfig;

  @internalProperty() private _configEntities?: string[];

  public setConfig(config: LogbookCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities;
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _entities(): string[] {
    return this._config!.entities || [];
  }

  get _hours_to_show(): number {
    return this._config!.hours_to_show || 24;
  }

  get _theme(): string {
    return this._config!.theme || "";
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
          <paper-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.title"
            )}
            .value=${this._title}
            .configValue=${"title"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <paper-input
            type="number"
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hours_to_show"
            )}
            .value=${this._hours_to_show}
            .configValue=${"hours_to_show"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <h3>
            ${`${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.entities"
            )} (${this.hass!.localize(
              "ui.panel.lovelace.editor.card.config.required"
            )})`}
          </h3>
          <ha-entities-picker
            .hass=${this.hass}
            .value=${this._configEntities}
            @value-changed=${this._valueChanged}
          >
          </ha-entities-picker>
        </div>
        <div slot="advanced" class="card-config">
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

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (ev.detail && ev.detail.value && Array.isArray(ev.detail.value)) {
      this._config = { ...this._config, entities: ev.detail.value };
    } else if (target.configValue) {
      if (target.value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        let value: any = target.value;

        if (target.type === "number") {
          value = Number(value);
        }

        this._config = {
          ...this._config,
          [target.configValue!]: value,
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
    "hui-logbook-card-editor": HuiLogbookCardEditor;
  }
}
