import "@polymer/paper-input/paper-input";
import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stateIcon } from "../../../../common/entity/state_icon";
import "../../../../components/ha-icon-input";
import { ActionConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { LightCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import "../hui-config-element-template";
import { actionConfigStruct, EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

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
export class HuiLightCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: LightCardConfig;

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

  get _double_tap_action(): ActionConfig | undefined {
    return this._config!.double_tap_action;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
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
      <hui-config-element-template
        .hass=${this.hass}
        .isAdvanced=${this.isAdvanced}
      >
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
          <paper-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )}
            .value=${this._name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <div slot="advanced" class="card-config">
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
          <hui-action-editor
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hold_action"
            )}
            .hass=${this.hass}
            .config=${this._hold_action}
            .actions=${actions}
            .configValue=${"hold_action"}
            @value-changed=${this._valueChanged}
          ></hui-action-editor>

          <hui-action-editor
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.double_tap_action"
            )}
            .hass=${this.hass}
            .config=${this._double_tap_action}
            .actions=${actions}
            .configValue=${"double_tap_action"}
            @value-changed=${this._valueChanged}
          ></hui-action-editor>
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>
      </hui-config-element-template>
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
