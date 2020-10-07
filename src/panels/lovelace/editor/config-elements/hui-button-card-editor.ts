import "@polymer/paper-input/paper-input";
import { CSSResult, customElement, html, TemplateResult } from "lit-element";
import { assert, boolean, object, optional, string } from "superstruct";

import { fireEvent } from "../../../../common/dom/fire_event";
import { stateIcon } from "../../../../common/entity/state_icon";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { ActionConfig } from "../../../../data/lovelace";
import { ButtonCardConfig } from "../../cards/types";
import { actionConfigStruct, EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";
import { HuiActionBaseCardEditor } from "./hui-action-base-card-editor";

import "../hui-element-editor";
import "../../components/hui-actions-editor";
import "../hui-detail-editor-base";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-switch";

const cardConfigStruct = object({
  type: string(),
  entity: optional(string()),
  name: optional(string()),
  show_name: optional(boolean()),
  icon: optional(string()),
  show_icon: optional(boolean()),
  icon_height: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
  theme: optional(string()),
  show_state: optional(boolean()),
});

@customElement("hui-button-card-editor")
export class HuiButtonCardEditor extends HuiActionBaseCardEditor {
  public setConfig(config: ButtonCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _show_name(): boolean {
    return this._config!.show_name ?? true;
  }

  get _show_state(): boolean {
    return this._config!.show_state ?? false;
  }

  get _icon(): string {
    return this._config!.icon || "";
  }

  get _show_icon(): boolean {
    return this._config!.show_icon ?? true;
  }

  get _icon_height(): string {
    return this._config!.icon_height && this._config!.icon_height.includes("px")
      ? String(parseFloat(this._config!.icon_height))
      : "";
  }

  get _tap_action(): ActionConfig | undefined {
    return this._config!.tap_action;
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "more-info" };
  }

  get _double_tap_action(): ActionConfig {
    return this._config!.double_tap_action || { action: "none" };
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const dir = computeRTLDirection(this.hass!);

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
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
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
        <div class="side-by-side">
          <div>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.show_name"
              )}
              .dir=${dir}
            >
              <ha-switch
                .checked=${this._show_name !== false}
                .configValue=${"show_name"}
                @change=${this._change}
              ></ha-switch>
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
                .checked=${this._show_state !== false}
                .configValue=${"show_state"}
                @change=${this._change}
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
                .checked=${this._show_icon !== false}
                .configValue=${"show_icon"}
                @change=${this._change}
              ></ha-switch>
            </ha-formfield>
          </div>
        </div>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.icon_height"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._icon_height}
            .configValue=${"icon_height"}
            @value-changed=${this._valueChanged}
            type="number"
            ><div class="suffix" slot="suffix">px</div>
          </paper-input>
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>
        <hui-actions-editor
          .hass=${this.hass}
          .tapAction=${this._tap_action}
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

  private _change(ev: Event) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = target.checked;

    if (this[`_${target.configValue}`] === value) {
      return;
    }

    fireEvent(this, "config-changed", {
      config: {
        ...this._config,
        [target.configValue!]: value,
      },
    });
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
    let newConfig;
    if (target.configValue) {
      if (value !== false && !value) {
        newConfig = { ...this._config };
        delete newConfig[target.configValue!];
      } else {
        newConfig = {
          ...this._config,
          [target.configValue!]:
            target.configValue === "icon_height" && !isNaN(Number(target.value))
              ? `${String(value)}px`
              : value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: newConfig });
  }

  static get styles(): CSSResult {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-editor": HuiButtonCardEditor;
  }
}
