import "@polymer/paper-input/paper-input";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-area-picker";
import { HomeAssistant } from "../../../../types";
import { AreaCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    area: optional(string()),
    navigation_path: optional(string()),
    theme: optional(string()),
  })
);

@customElement("hui-area-card-editor")
export class HuiAreaCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AreaCardConfig;

  public setConfig(config: AreaCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _area(): string {
    return this._config!.area || "";
  }

  get _navigation_path(): string {
    return this._config!.navigation_path || "";
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
        <ha-area-picker
          .hass=${this.hass}
          .value=${this._area}
          .placeholder=${this._area}
          .configValue=${"area"}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.area")}
          @value-changed=${this._valueChanged}
        ></ha-area-picker>
        <paper-input
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.action-editor.navigation_path"
          )}
          .value=${this._navigation_path}
          .configValue=${"navigation_path"}
          @value-changed=${this._valueChanged}
        >
        </paper-input>
        <hui-theme-select-editor
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></hui-theme-select-editor>
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

    let newConfig;
    if (target.configValue) {
      if (!value) {
        newConfig = { ...this._config };
        delete newConfig[target.configValue!];
      } else {
        newConfig = {
          ...this._config,
          [target.configValue!]: value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: newConfig });
  }

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card-editor": HuiAreaCardEditor;
  }
}
