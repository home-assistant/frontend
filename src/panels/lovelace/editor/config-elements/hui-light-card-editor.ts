import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import "../../components/hui-theme-select-editor";

import "../../../../components/ha-icon-input";
import "../../components/hui-entity-editor";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "./config-elements-style";
import { LightCardConfig } from "../../cards/types";
import { stateIcon } from "../../../../common/entity/state_icon";

const cardConfigStruct = struct({
  type: "string",
  name: "string?",
  entity: "string?",
  theme: "string?",
  icon: "string?",
});

@customElement("hui-light-card-editor")
export class HuiLightCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: LightCardConfig;

  public setConfig(config: LightCardConfig): void {
    this._config = cardConfigStruct(config);
  }

  get _name(): string {
    return this._config!.name || "";
  }

  get _theme(): string {
    return this._config!.theme || "default";
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _icon(): string {
    return this._config!.icon || "";
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <ha-entity-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass=${this.hass}
          .value="${this._entity}"
          .configValue=${"entity"}
          include-domains='["light"]'
          @change="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>
        <div class="side-by-side">
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
          <ha-icon-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.icon"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._icon}"
            .placeholder=${this._icon ||
              stateIcon(this.hass.states[this._entity])}
            .configValue="${"icon"}"
            @value-changed="${this._valueChanged}"
          ></ha-icon-input>
        </div>

        <hui-theme-select-editor
          .hass=${this.hass}
          .value="${this._theme}"
          .configValue="${"theme"}"
          @value-changed="${this._valueChanged}"
        ></hui-theme-select-editor>
      </div>
    `;
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
    "hui-light-card-editor": HuiLightCardEditor;
  }
}
