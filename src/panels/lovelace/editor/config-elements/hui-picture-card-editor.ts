import "@polymer/paper-input/paper-input";
import { CSSResult, customElement, html, TemplateResult } from "lit-element";
import { assert, object, optional, string } from "superstruct";

import { fireEvent } from "../../../../common/dom/fire_event";
import { ActionConfig } from "../../../../data/lovelace";
import { PictureCardConfig } from "../../cards/types";
import { actionConfigStruct, EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";
import { HuiActionBaseCardEditor } from "./hui-action-base-card-editor";

import "../../components/hui-theme-select-editor";
import "../hui-detail-editor-base";
import "../hui-element-editor";
import "../../components/hui-actions-editor";

const cardConfigStruct = object({
  type: string(),
  image: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
  theme: optional(string()),
});

@customElement("hui-picture-card-editor")
export class HuiPictureCardEditor extends HuiActionBaseCardEditor {
  public setConfig(config: PictureCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _image(): string {
    return this._config!.image || "";
  }

  get _tap_action(): ActionConfig {
    return this._config!.tap_action || { action: "none" };
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "none" };
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
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.image"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .value="${this._image}"
          .configValue="${"image"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
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

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;

    if (this[`_${target.configValue}`] === target.value) {
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
    "hui-picture-card-editor": HuiPictureCardEditor;
  }
}
