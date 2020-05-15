import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type {
  CalendarCardConfig,
  EntitiesCardEntityConfig,
} from "../../cards/types";
import { struct } from "../../common/structs/struct";
import "../../components/hui-entity-editor";
import "../../../../components/entity/ha-entities-picker";
import "../../components/hui-theme-select-editor";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import type { EditorTarget, EntitiesEditorEvent } from "../types";
import { entitiesConfigStruct } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = struct({
  type: "string",
  title: "string|number?",
  theme: "string?",
  entities: [entitiesConfigStruct],
});

@customElement("hui-calendar-card-editor")
export class HuiCalendarCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: CalendarCardConfig;

  @property() private _configEntities?: EntitiesCardEntityConfig[];

  public setConfig(config: CalendarCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
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
        .hass=${this.hass}
        .value=${this._configEntities?.map((e) => e.entity)}
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

    if (
      (target.configValue! === "title" && target.value === this._title) ||
      (target.configValue! === "theme" && target.value === this._theme)
    ) {
      return;
    }

    if (ev.detail && ev.detail.value && Array.isArray(ev.detail.value)) {
      this._config.entities = ev.detail.value;
      this._configEntities = processEditorEntities(this._config.entities);
    } else if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
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
