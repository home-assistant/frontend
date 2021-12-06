import "@polymer/paper-input/paper-input";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-area-picker";
import { HomeAssistant } from "../../../../types";
import { AreaCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";
import "../../../../components/ha-formfield";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    area: optional(string()),
    navigation_path: optional(string()),
    theme: optional(string()),
    show_camera: optional(boolean()),
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

  get _show_camera(): boolean {
    return this._config!.show_camera || false;
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
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.area.name"
          )}
          @value-changed=${this._valueChanged}
        ></ha-area-picker>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.area.show_camera"
          )}
          .dir=${computeRTLDirection(this.hass)}
        >
          <ha-switch
            .checked=${this._show_camera}
            .configValue=${"show_camera"}
            @change=${this._valueChanged}
          ></ha-switch>
        </ha-formfield>
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
    const value =
      target.checked !== undefined ? target.checked : ev.detail.value;

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
