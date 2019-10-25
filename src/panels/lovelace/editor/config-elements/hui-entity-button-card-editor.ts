import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import "../../components/hui-action-picker";
import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";

import { struct } from "../../common/structs/struct";
import {
  EntitiesEditorEvent,
  EditorTarget,
  actionConfigStruct,
} from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "./config-elements-style";
import { ActionConfig } from "../../../../data/lovelace";
import { EntityButtonCardConfig } from "../../cards/types";

const cardConfigStruct = struct({
  type: "string",
  entity: "string?",
  name: "string?",
  show_name: "boolean?",
  icon: "string?",
  show_icon: "boolean?",
  icon_height: "string?",
  tap_action: struct.optional(actionConfigStruct),
  hold_action: struct.optional(actionConfigStruct),
  double_tap_action: struct.optional(actionConfigStruct),
  theme: "string?",
});

@customElement("hui-entity-button-card-editor")
export class HuiEntityButtonCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityButtonCardConfig;
  @property() private _showEntityOptions?: boolean;
  @property() private _showDisplayOptions?: boolean;
  @property() private _showActionOptions?: boolean;

  public setConfig(config: EntityButtonCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _show_name(): boolean {
    return this._config!.show_name || true;
  }

  get _icon(): string {
    return this._config!.icon || "";
  }

  get _show_icon(): boolean {
    return this._config!.show_icon || true;
  }

  get _icon_height(): string {
    return this._config!.icon_height && this._config!.icon_height.includes("px")
      ? String(parseFloat(this._config!.icon_height))
      : "";
  }

  get _tap_action(): ActionConfig {
    return this._config!.tap_action || { action: "more-info" };
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "none" };
  }

  get _theme(): string {
    return this._config!.theme || "default";
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    const actions = [
      "more-info",
      "toggle",
      "navigate",
      "url",
      "call-service",
      "none",
    ];

    return html`
      ${configElementStyle}
      <div class="card-config">
        ${!this._showEntityOptions &&
        !this._showActionOptions &&
        !this._showDisplayOptions
          ? html`
              <paper-listbox>
                <paper-item @click=${this._toggleEntityOptions}
                  >Entity Options</paper-item
                >
                <paper-item @click=${this._toggleActionOptions}
                  >Action Options</paper-item
                >
                <paper-item @click=${this._toggleDisplayOptions}
                  >Display Options</paper-item
                >
              </paper-listbox>
            `
          : html`
              <ha-icon @click=${this._showList} icon="hass:arrow-left"
                >Back</ha-icon
              >
            `}
        ${this._showEntityOptions
          ? html`
              <ha-entity-picker
                .label="${this.hass.localize(
                  "ui.panel.lovelace.editor.card.generic.entity"
                )} (${this.hass.localize(
                  "ui.panel.lovelace.editor.card.config.required"
                )})"
                .hass="${this.hass}"
                .value="${this._entity}"
                .configValue=${"entity"}
                @change="${this._valueChanged}"
                allow-custom-entity
              ></ha-entity-picker>
            `
          : ""}
        ${this._showDisplayOptions
          ? html`<paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.name"
          )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._name}"
            .configValue="${"name"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.icon"
          )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._icon}"
            .configValue="${"icon"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        <div class="side-by-side">
          <ha-switch
            ?checked="${this._config!.show_name !== false}"
            .configValue="${"show_name"}"
            @change="${this._valueChanged}"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.show_name"
            )}</ha-switch
          >
          <ha-switch
            ?checked="${this._config!.show_icon !== false}"
            .configValue="${"show_icon"}"
            @change="${this._valueChanged}"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.show_icon"
            )}</ha-switch
          >
        </div>
          <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.icon_height"
          )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._icon_height}"
            .configValue="${"icon_height"}"
            @value-changed="${this._valueChanged}"
            type="number"
          ><div class="suffix" slot="suffix">px</div>
          </paper-input>
          <hui-theme-select-editor
            .hass="${this.hass}"
            .value="${this._theme}"
            .configValue="${"theme"}"
            @theme-changed="${this._valueChanged}"
          ></hui-theme-select-editor>
        </paper-input>`
          : ""}
        ${this._showActionOptions
          ? html`
              <hui-action-picker
                .hass=${this.hass}
                .config=${this._config}
                @actions-changed=${this._valueChanged}
              ></hui-action-picker>
            `
          : ""}
      </div>
    `;
  }

  private _showList() {
    this._showDisplayOptions = this._showEntityOptions = this._showActionOptions = false;
  }

  private _toggleEntityOptions() {
    this._showEntityOptions = !this._showEntityOptions;
  }

  private _toggleActionOptions() {
    this._showActionOptions = !this._showActionOptions;
  }

  private _toggleDisplayOptions() {
    this._showDisplayOptions = !this._showDisplayOptions;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (
      this[`_${target.configValue}`] === target.value ||
      this[`_${target.configValue}`] === target.config
    ) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        let newValue: string | undefined;
        if (
          target.configValue === "icon_height" &&
          !isNaN(Number(target.value))
        ) {
          newValue = `${String(target.value)}px`;
        }
        this._config = {
          ...this._config,
          [target.configValue!]:
            target.checked !== undefined
              ? target.checked
              : newValue !== undefined
              ? newValue
              : target.value
              ? target.value
              : target.config,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-button-card-editor": HuiEntityButtonCardEditor;
  }
}
