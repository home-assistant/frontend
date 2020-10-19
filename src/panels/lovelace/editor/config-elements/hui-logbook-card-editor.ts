import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import { HomeAssistant } from "../../../../types";
import { LogbookCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  entity: optional(string()),
  title: optional(string()),
  hours_to_show: optional(number()),
  theme: optional(string()),
});

@customElement("hui-logbook-card-editor")
export class HuiLogbookCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: LogbookCardConfig;

  public setConfig(config: LogbookCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _entity(): string {
    return this._config!.entity || "";
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
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._title}
          .configValue=${"title"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <div class="side-by-side">
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
          <paper-input
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hours_to_show"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._hours_to_show}
            .configValue=${"hours_to_show"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <ha-entity-picker
          allow-custom-entity
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )}
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          @change=${this._valueChanged}
        ></ha-entity-picker>
      </div>
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-logbook-card-editor": HuiLogbookCardEditor;
  }
}
