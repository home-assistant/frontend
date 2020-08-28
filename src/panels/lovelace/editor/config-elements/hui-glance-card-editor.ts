import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import "../../../../components/ha-formfield";
import { HomeAssistant } from "../../../../types";
import { ConfigEntity, GlanceCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import {
  EditorTarget,
  entitiesConfigStruct,
  EntitiesEditorEvent,
} from "../types";
import { configElementStyle } from "./config-elements-style";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import {
  string,
  union,
  object,
  optional,
  number,
  boolean,
  assert,
  array,
} from "superstruct";

const cardConfigStruct = object({
  type: string(),
  title: optional(union([string(), number()])),
  theme: optional(string()),
  columns: optional(number()),
  show_name: optional(boolean()),
  show_state: optional(boolean()),
  show_icon: optional(boolean()),
  state_color: optional(boolean()),
  entities: array(entitiesConfigStruct),
});

@customElement("hui-glance-card-editor")
export class HuiGlanceCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: GlanceCardConfig;

  @internalProperty() private _configEntities?: ConfigEntity[];

  public setConfig(config: GlanceCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  get _columns(): number {
    return this._config!.columns || NaN;
  }

  get _show_name(): boolean {
    return this._config!.show_name || true;
  }

  get _show_icon(): boolean {
    return this._config!.show_icon || true;
  }

  get _show_state(): boolean {
    return this._config!.show_state || true;
  }

  get _state_color(): boolean {
    return this._config!.state_color ?? true;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const dir = computeRTLDirection(this.hass!);

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
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.glance.columns"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            type="number"
            .value=${this._columns}
            .configValue=${"columns"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <div class="side-by-side">
          <div>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.show_name"
              )}
              .dir=${dir}
            >
              <ha-switch
                .checked=${this._config!.show_name !== false}
                .configValue=${"show_name"}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          </div>
          <div>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.show_icon"
              )}
              .dir=${dir}
            >
              <ha-switch
                .checked=${this._config!.show_icon !== false}
                .configValue=${"show_icon"}
                @change=${this._valueChanged}
              >
              </ha-switch>
            </ha-formfield>
          </div>
          <div>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.show_state"
              )}
              .dir=${dir}
            >
              <ha-switch
                .checked=${this._config!.show_state !== false}
                .configValue=${"show_state"}
                @change=${this._valueChanged}
              >
              </ha-switch>
            </ha-formfield>
          </div>
        </div>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.state_color"
          )}
          .dir=${computeRTLDirection(this.hass)}
        >
          <ha-switch
            .checked=${this._config!.state_color}
            .configValue=${"state_color"}
            @change=${this._valueChanged}
          ></ha-switch>
        </ha-formfield>
      </div>
      <hui-entity-editor
        .hass=${this.hass}
        .entities=${this._configEntities}
        @entities-changed=${this._valueChanged}
      ></hui-entity-editor>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (target.configValue && this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (ev.detail && ev.detail.entities) {
      this._config = { ...this._config, entities: ev.detail.entities };

      this._configEntities = processEditorEntities(this._config.entities);
    } else if (target.configValue) {
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
        this._config = {
          ...this._config,
          [target.configValue!]:
            target.checked !== undefined ? target.checked : value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card-editor": HuiGlanceCardEditor;
  }
}
