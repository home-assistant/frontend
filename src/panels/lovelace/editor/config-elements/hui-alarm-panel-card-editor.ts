import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "./config-elements-style";
import { AlarmPanelCardConfig } from "../../cards/types";

import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-icon";
import "../../components/hui-theme-select-editor";

const cardConfigStruct = struct({
  type: "string",
  entity: "string?",
  name: "string?",
  states: "array?",
  theme: "string?",
});

@customElement("hui-alarm-panel-card-editor")
export class HuiAlarmPanelCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: AlarmPanelCardConfig;

  public setConfig(config: AlarmPanelCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _states(): string[] {
    return this._config!.states || [];
  }

  get _theme(): string {
    return this._config!.theme || "Backend-selected";
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    const states = ["arm_home", "arm_away", "arm_night", "arm_custom_bypass"];

    return html`
      ${configElementStyle}
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass="${this.hass}"
          .value="${this._entity}"
          .configValue=${"entity"}
          domain-filter="alarm_control_panel"
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
        <span>Used States</span> ${this._states.map((state, index) => {
          return html`
            <div class="states">
              <paper-item>${state}</paper-item>
              <ha-icon
                class="deleteState"
                .value="${index}"
                icon="hass:close"
                @click=${this._stateRemoved}
              ></ha-icon>
            </div>
          `;
        })}
        <paper-dropdown-menu
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.alarm-panel.available_states"
          )}"
          @value-changed="${this._stateAdded}"
        >
          <paper-listbox slot="dropdown-content">
            ${states.map((state) => {
              return html`
                <paper-item>${state}</paper-item>
              `;
            })}
          </paper-listbox>
        </paper-dropdown-menu>
        <hui-theme-select-editor
          .hass="${this.hass}"
          .value="${this._theme}"
          .configValue="${"theme"}"
          @theme-changed="${this._valueChanged}"
        ></hui-theme-select-editor>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .states {
        display: flex;
        flex-direction: row;
      }
      .deleteState {
        visibility: hidden;
      }
      .states:hover > .deleteState {
        visibility: visible;
      }
      ha-icon {
        padding-top: 12px;
      }
    `;
  }

  private _stateRemoved(ev: EntitiesEditorEvent): void {
    if (!this._config || !this._states || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;
    const index = Number(target.value);
    if (index > -1) {
      const newStates = this._states;
      newStates.splice(index, 1);
      this._config = {
        ...this._config,
        states: newStates,
      };
      fireEvent(this, "config-changed", { config: this._config });
    }
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
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue!]: target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-panel-card-editor": HuiAlarmPanelCardEditor;
  }
}
