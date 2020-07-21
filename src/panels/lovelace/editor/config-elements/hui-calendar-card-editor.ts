import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  internalProperty,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type { CalendarCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../../../components/entity/ha-entities-picker";
import "../../components/hui-theme-select-editor";
import type { LovelaceCardEditor } from "../../types";
import type { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import {
  string,
  optional,
  object,
  boolean,
  array,
  union,
  assert,
} from "superstruct";

const cardConfigStruct = object({
  type: string(),
  title: optional(union([string(), boolean()])),
  theme: optional(string()),
  entities: array(string()),
});

@customElement("hui-calendar-card-editor")
export class HuiCalendarCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) private _config?: CalendarCardConfig;

  @internalProperty() private _configEntities?: string[];

  public setConfig(config: CalendarCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities;
  }

  get _title(): string {
    return this._config!.title || "";
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
        <div class="side-by-side">
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
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>
      </div>
      <h3>
        ${"Calendar Entities" +
        " (" +
        this.hass!.localize("ui.panel.lovelace.editor.card.config.required") +
        ")"}
      </h3>
      <ha-entities-picker
        .hass=${this.hass!}
        .value=${this._configEntities}
        .includeDomains=${["calendar"]}
        @value-changed=${this._valueChanged}
      >
      </ha-entities-picker>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent | CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    if (ev.detail && ev.detail.value && Array.isArray(ev.detail.value)) {
      this._config = { ...this._config, entities: ev.detail.value };

      console.log(ev);
    } else if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card-editor": HuiCalendarCardEditor;
  }
}
