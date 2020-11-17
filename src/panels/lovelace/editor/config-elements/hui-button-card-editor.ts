import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stateIcon } from "../../../../common/entity/state_icon";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import { ActionConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { ButtonCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { actionConfigStruct, EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

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
  theme: optional(string()),
  show_state: optional(boolean()),
});

const actions = [
  "more-info",
  "toggle",
  "navigate",
  "url",
  "call-service",
  "none",
];

@customElement("hui-button-card-editor")
export class HuiButtonCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: ButtonCardConfig;

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

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <ha-entity-picker
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )}
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          @value-changed=${this._valueChanged}
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
        <hui-action-editor
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.tap_action"
          )}
          .hass=${this.hass}
          .config=${this._tap_action}
          .actions=${actions}
          .configValue=${"tap_action"}
          .tooltipText=${this.hass.localize(
            "ui.panel.lovelace.editor.card.button.default_action_help"
          )}
          @value-changed=${this._valueChanged}
        ></hui-action-editor>
      </div>
      ${this.isAdvanced
        ? html`
            <ha-expansion-panel>
              <span class="advanced-title" slot="title">Advanced options</span>
              <div class="card-config">
                <div class="side-by-side">
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
                  <paper-input
                    .label=${this.hass.localize(
                      "ui.panel.lovelace.editor.card.generic.icon_height"
                    )}
                    .value=${this._icon_height}
                    .configValue=${"icon_height"}
                    @value-changed=${this._valueChanged}
                    type="number"
                    ><div class="suffix" slot="suffix">px</div>
                  </paper-input>
                </div>
                <hui-theme-select-editor
                  .hass=${this.hass}
                  .value=${this._theme}
                  .configValue=${"theme"}
                  @value-changed=${this._valueChanged}
                ></hui-theme-select-editor>
                <hui-action-editor
                  .label=${this.hass.localize(
                    "ui.panel.lovelace.editor.card.generic.hold_action"
                  )}
                  .hass=${this.hass}
                  .config=${this._hold_action}
                  .actions=${actions}
                  .configValue=${"hold_action"}
                  .tooltipText=${this.hass.localize(
                    "ui.panel.lovelace.editor.card.button.default_action_help"
                  )}
                  @value-changed=${this._valueChanged}
                ></hui-action-editor>
                <ha-settings-row three-line>
                  <span slot="heading">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.card.generic.show_state"
                    )}
                  </span>
                  <ha-switch
                    .checked=${this._show_state !== false}
                    .configValue=${"show_state"}
                    @change=${this._change}
                  ></ha-switch>
                </ha-settings-row>
                <ha-settings-row three-line>
                  <span slot="heading">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.card.generic.show_name"
                    )}
                  </span>
                  <ha-switch
                    .checked=${this._show_name !== false}
                    .configValue=${"show_name"}
                    @change=${this._change}
                  ></ha-switch>
                </ha-settings-row>
                <ha-settings-row three-line>
                  <span slot="heading">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.card.generic.show_icon"
                    )}
                  </span>
                  <ha-switch
                    .checked=${this._show_icon !== false}
                    .configValue=${"show_icon"}
                    @change=${this._change}
                  ></ha-switch>
                </ha-settings-row>
              </div>
            </ha-expansion-panel>
          `
        : ""}
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

  static get styles(): CSSResultArray {
    return [
      configElementStyle,
      css`
        ha-expansion-panel {
          padding-top: 8px;
        }

        .advanced-title {
          font-size: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-editor": HuiButtonCardEditor;
  }
}
