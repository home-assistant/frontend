import "@polymer/paper-input/paper-input";
import { CSSResult, customElement, html, TemplateResult } from "lit-element";
import { assert, object, optional, string } from "superstruct";

import { fireEvent } from "../../../../common/dom/fire_event";
import { stateIcon } from "../../../../common/entity/state_icon";
import { ActionConfig } from "../../../../data/lovelace";
import { LightCardConfig } from "../../cards/types";
import { actionConfigStruct, EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";
import { HuiActionBaseCardEditor } from "./hui-action-base-card-editor";

import "../../../../components/ha-icon-input";
import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";
import "../hui-detail-editor-base";
import "../hui-element-editor";
import "../../components/hui-actions-editor";

const cardConfigStruct = object({
  type: string(),
  name: optional(string()),
  entity: optional(string()),
  theme: optional(string()),
  icon: optional(string()),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const includeDomains = ["light"];

@customElement("hui-light-card-editor")
export class HuiLightCardEditor extends HuiActionBaseCardEditor {
  public setConfig(config: LightCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _icon(): string {
    return this._config!.icon || "";
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "more-info" };
  }

  get _double_tap_action(): ActionConfig {
    return this._config!.double_tap_action || { action: "none" };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    if (this._editActionConfig) {
      return html`
        <hui-detail-editor-base
          .hass=${this.hass}
          .guiModeAvailable=${this._editActionGuiModeAvailable}
          .guiMode=${this._editActionGuiMode}
          @toggle-gui-mode=${this._toggleMode}
          @go-back=${this._goBack}
        >
          <span slot="title"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic." + this._editActionType
            )}</span
          >
          <hui-element-editor
            .hass=${this.hass}
            .value=${this._editActionConfig}
            elementType="action"
            @config-changed=${this._handleActionConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-element-editor>
        </hui-detail-editor-base>
      `;
    }

    return html`
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
          @value-changed=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
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
        </div>

        <hui-theme-select-editor
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></hui-theme-select-editor>

        <hui-actions-editor
          .hass=${this.hass}
          .holdAction=${this._hold_action}
          .doubleTapAction=${this._double_tap_action}
          .tooltipText=${this.hass.localize(
            "ui.panel.lovelace.editor.card.button.default_action_help"
          )}
          @edit-action=${this._editAction}
          @clear-action=${this._clearAction}
        ></hui-actions-editor>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      if (value !== false && !value) {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
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
    "hui-light-card-editor": HuiLightCardEditor;
  }
}
