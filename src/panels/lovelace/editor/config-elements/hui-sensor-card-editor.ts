import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
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
import { stateIcon } from "../../../../common/entity/state_icon";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-icon-input";
import { HomeAssistant } from "../../../../types";
import { SensorCardConfig } from "../../cards/types";
import { struct } from "../../common/structs/struct";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = struct({
  type: "string",
  entity: "string?",
  name: "string?",
  icon: "string?",
  graph: "string?",
  unit: "string?",
  detail: "number?",
  theme: "string?",
  hours_to_show: "number?",
});

const includeDomains = ["sensor"];

@customElement("hui-sensor-card-editor")
export class HuiSensorCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: SensorCardConfig;

  public setConfig(config: SensorCardConfig): void {
    config = cardConfigStruct(config);
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

  get _detail(): number | string {
    return this._config!.number || "1";
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
      ${configElementStyle}
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass=${this.hass}
          .value="${this._entity}"
          .configValue=${"entity"}
          .includeDomains=${includeDomains}
          @change="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.name"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value="${this._name}"
          .configValue="${"name"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="side-by-side">
          <ha-icon-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.icon"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._icon}
            .placeholder=${this._icon ||
            stateIcon(this.hass.states[this._entity])}
            .configValue=${"icon"}
            @value-changed=${this._valueChanged}
          ></ha-icon-input>
          <paper-dropdown-menu
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.sensor.graph_type"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .configValue="${"graph"}"
            @value-changed="${this._valueChanged}"
          >
            <paper-listbox
              slot="dropdown-content"
              .selected="${graphs.indexOf(this._graph)}"
            >
              ${graphs.map((graph) => {
                return html` <paper-item>${graph}</paper-item> `;
              })}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.unit"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._unit}"
            .configValue="${"unit"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.sensor.graph_detail"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            type="number"
            .value="${this._detail}"
            .configValue="${"detail"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <div class="side-by-side">
          <hui-theme-select-editor
            .hass=${this.hass}
            .value="${this._theme}"
            .configValue="${"theme"}"
            @value-changed="${this._valueChanged}"
          ></hui-theme-select-editor>
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hours_to_show"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            type="number"
            .value="${this._hours_to_show}"
            .configValue="${"hours_to_show"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
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
    "hui-sensor-card-editor": HuiSensorCardEditor;
  }
}
