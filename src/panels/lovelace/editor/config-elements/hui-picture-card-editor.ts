import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { ActionConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { PictureCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import "../../../../components/ha-theme-picker";
import { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    image: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    theme: optional(string()),
  })
);

@customElement("hui-picture-card-editor")
export class HuiPictureCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureCardConfig;

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

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const actions = ["navigate", "url", "call-service", "none"];

    return html`
      <div class="card-config">
        <ha-textfield
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.image"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .value=${this._image}
          .configValue=${"image"}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-theme-picker
          .hass=${this.hass}
          .value=${this._theme}
          .label=${`${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.theme"
          )} (${this.hass!.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})`}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></ha-theme-picker>
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
          @value-changed=${this._valueChanged}
        ></hui-action-editor>
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
          @value-changed=${this._valueChanged}
        ></hui-action-editor>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail?.value ?? target.value;

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

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        ha-textfield {
          display: block;
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-card-editor": HuiPictureCardEditor;
  }
}
