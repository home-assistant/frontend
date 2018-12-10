import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { struct } from "../../common/structs/struct";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-input/paper-input";

import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config } from "../../cards/hui-alarm-panel-card";
import { configElementStyle } from "./config-elements-style";

import "../../../../components/entity/state-badge";
import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import { repeat } from "lit-html/directives/repeat";

const cardConfigStruct = struct({
  type: "string",
  id: "string|number",
  entity: "string?",
  name: "string?",
  states: "array?",
});

export class HuiAlarmPanelCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);

    this._config = { type: "alarm-panel", ...config };
  }

  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {} };
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _states(): string[] {
    return this._config!.states || ["arm_home", "arm_away"];
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const states = ["arm_home", "arm_away", "arm_night", "arm_custom_bypass"];
    const availableStates = states.filter((state) => {
      return this._states.indexOf(state) === -1;
    });
    console.log(this._states);

    return html`
      ${configElementStyle}
      <div class="card-config">
        <div class="side-by-side">
          <paper-input
            label="Name"
            value="${this._name}"
            .configValue="${"name"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this._entity}"
            .configValue=${"entity"}
            .domainFilter=${"alarm_control_panel"}
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
        </div>
        <span>Used States</span> ${
          this._states.map((state, index) => {
            return html`
              <paper-item .index="${index}">${state}</paper-item>
            `;
          })
        }
        <paper-dropdown-menu
          label="Available States"
          dynamic-align
          @value-changed="${this._stateAdded}"
        >
          <paper-listbox slot="dropdown-content">
            ${
              availableStates.map((state) => {
                return html`
                  <paper-item theme="${state}">${state}</paper-item>
                `;
              })
            }
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
    `;
  }

  private _stateAdded(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (!target.value || this._states.indexOf(target.value) >= 0) {
      return;
    }
    const newStates = this._states;
    newStates.push(target.value);
    console.log(newStates);
    this._config = {
      ...this._config,
      states: newStates,
    };
    target.value = "";
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
      this._config = {
        ...this._config,
        [target.configValue!]: target.value,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-panel-card-editor": HuiAlarmPanelCardEditor;
  }
}

customElements.define("hui-alarm-panel-card-editor", HuiAlarmPanelCardEditor);
