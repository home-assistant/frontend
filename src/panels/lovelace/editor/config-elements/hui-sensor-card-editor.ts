import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
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
import { stateIcon } from "../../../../common/entity/state_icon";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { SensorCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import "../hui-config-element-template";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  entity: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  graph: optional(string()),
  unit: optional(string()),
  detail: optional(number()),
  theme: optional(string()),
  hours_to_show: optional(number()),
});

const includeDomains = ["sensor"];

@customElement("hui-sensor-card-editor")
export class HuiSensorCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: SensorCardConfig;

  public setConfig(config: SensorCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _icon(): string {
    return this._config!.icon || "";
  }

  get _graph(): string {
    return this._config!.graph || "none";
  }

  get _unit(): string {
    return this._config!.unit || "";
  }

  get _detail(): number {
    return this._config!.detail ?? 1;
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  get _hours_to_show(): number | string {
    return this._config!.hours_to_show || "24";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const graphs = ["line", "none"];

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
          <div class="side-by-side">
            <paper-dropdown-menu
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.sensor.graph_type"
              )}
              .configValue=${"graph"}
              @value-changed=${this._valueChanged}
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${graphs.indexOf(this._graph)}
              >
                ${graphs.map((graph) => {
                  return html`<paper-item>${graph}</paper-item>`;
                })}
              </paper-listbox>
            </paper-dropdown-menu>
            <paper-input
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.hours_to_show"
              )}
              type="number"
              .value=${this._hours_to_show}
              .configValue=${"hours_to_show"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          </div>
        </div>
        <div slot="advanced" class="card-config">
          <ha-settings-row three-line>
            <span slot="heading">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.sensor.show_more_detail"
              )}
            </span>
            <ha-switch
              .checked=${this._detail === 2}
              .configValue=${"detail"}
              @change=${this._change}
            ></ha-switch>
          </ha-settings-row>
          <paper-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.unit"
            )}
            .value=${this._unit}
            .configValue=${"unit"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <ha-icon-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.icon"
            )}
            .value=${this._icon}
            .placeholder=${this._icon ||
            stateIcon(this.hass.states[this._entity])}
            .configValue=${"icon"}
            @value-changed=${this._valueChanged}
          ></ha-icon-input>
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

  private _change(ev: Event) {
    if (!this._config || !this.hass) {
      return;
    }

    const value = (ev.target! as EditorTarget).checked ? 2 : 1;

    if (this._detail === value) {
      return;
    }

    this._config = {
      ...this._config,
      detail: value,
    };

    fireEvent(this, "config-changed", { config: this._config });
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

  static get styles(): CSSResult {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-card-editor": HuiSensorCardEditor;
  }
}
