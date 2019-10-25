import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { EditorTarget } from "../editor/types";
import { ActionConfig } from "../../../data/lovelace";

declare global {
  // for fire event
  interface HASSDomEvents {
    "actions-changed": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "actions-changed": HASSDomEvent<undefined>;
  }
}

@customElement("hui-action-picker")
export class HuiActionPicker extends LitElement {
  @property() public config?: any;
  @property() public hass?: HomeAssistant;
  @property() private _showTapAction?: boolean;
  @property() private _showHoldAction?: boolean;
  @property() private _showDoubleTapAction?: boolean;

  get _tap_action(): ActionConfig {
    return this.config!.tap_action || { action: "none" };
  }

  get _hold_action(): ActionConfig {
    return this.config!.hold_action || { action: "none" };
  }

  get _double_tap_action(): ActionConfig {
    return this.config!.double_hold_action || { action: "none" };
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
      ${!this._showTapAction &&
      !this._showHoldAction &&
      !this._showDoubleTapAction
        ? html`
            <paper-listbox>
              <paper-item @click=${this._toggleTapAction}
                >${this.hass.localize(
                  "ui.panel.lovelace.editor.card.generic.tap_action"
                )}
                (${this.hass.localize(
                  "ui.panel.lovelace.editor.card.config.optional"
                )})</paper-item
              >
              <paper-item @click=${this._toggleHoldAction}
                >${this.hass.localize(
                  "ui.panel.lovelace.editor.card.generic.hold_action"
                )}
                (${this.hass.localize(
                  "ui.panel.lovelace.editor.card.config.optional"
                )})</paper-item
              >
              <paper-item @click=${this._toggleDoubleTapAction}
                >${this.hass.localize(
                  "ui.panel.lovelace.editor.card.generic.double_tap_action"
                )}
                (${this.hass.localize(
                  "ui.panel.lovelace.editor.card.config.optional"
                )})</paper-item
              >
            </paper-listbox>
          `
        : html`
            <ha-icon @click=${this._showList} icon="hass:arrow-left"
              >Back</ha-icon
            >
          `}
      ${this._showTapAction
        ? html`
            <hui-action-editor
              .label="${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.tap_action"
              )} (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})"
              .hass=${this.hass}
              .config=${this._tap_action}
              .actions=${actions}
              .configValue=${"tap_action"}
              @action-changed=${this._valueChanged}
            ></hui-action-editor>
          `
        : ""}
      ${this._showHoldAction
        ? html`
            <hui-action-editor
              .label="${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.hold_action"
              )} (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})"
              .hass=${this.hass}
              .config=${this._hold_action}
              .actions=${actions}
              .configValue=${"hold_action"}
              @action-changed=${this._valueChanged}
            ></hui-action-editor>
          `
        : ""}
      ${this._showDoubleTapAction
        ? html`
            <hui-action-editor
              .label="${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.double_tap_action"
              )} (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})"
              .hass=${this.hass}
              .config=${this._double_tap_action}
              .actions=${actions}
              .configValue=${"double_tap_action"}
              @action-changed=${this._valueChanged}
            ></hui-action-editor>
          `
        : ""}
    `;
  }

  private _showList() {
    this._showTapAction = this._showHoldAction = this._showDoubleTapAction = false;
  }

  private _toggleTapAction() {
    this._showTapAction = true;
  }

  private _toggleHoldAction() {
    this._showHoldAction = true;
  }

  private _toggleDoubleTapAction() {
    this._showDoubleTapAction = true;
  }

  private _valueChanged(ev: Event): void {
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue === "action") {
      this.config = { action: "none" };
    }
    if (target.configValue) {
      this.config = { ...this.config!, [target.configValue!]: target.value };
      fireEvent(this, "actions-changed");
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-picker": HuiActionPicker;
  }
}
