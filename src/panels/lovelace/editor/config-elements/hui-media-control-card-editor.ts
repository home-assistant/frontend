import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";

import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-switch";
import { MediaControlCardConfig } from "../../cards/types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = struct({
  type: "string",
  entity: "string?",
  show_controls_power: "boolean?",
  show_controls_playback: "boolean?",
  show_controls_volume: "boolean?",
});

@customElement("hui-media-control-card-editor")
export class HuiMediaControlCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: MediaControlCardConfig;

  public setConfig(config: MediaControlCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _show_controls_power(): boolean {
    return this._config!.show_controls_power || true;
  }

  get _show_controls_playback(): boolean {
    return this._config!.show_controls_playback || false;
  }

  get _show_controls_volume(): boolean {
    return this._config!.show_controls_volume || false;
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
          include-domains='["media_player"]'
          @change="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>
        <div class="side-by-side">
          <ha-switch
            .checked="${this._show_controls_power}"
            .configValue="${"show_controls_power"}"
            @change="${this._valueChanged}"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.media-control.show_controls_power"
            )}</ha-switch
          >
          <ha-switch
            .checked="${this._show_controls_playback}"
            .configValue="${"show_controls_playback"}"
            @change="${this._valueChanged}"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.media-control.show_controls_playback"
            )}</ha-switch
          >
        </div>
        <ha-switch
          .checked="${this._show_controls_volume}"
          .configValue="${"show_controls_volume"}"
          @change="${this._valueChanged}"
          >${this.hass.localize(
            "ui.panel.lovelace.editor.card.media-control.show_controls_volume"
          )}</ha-switch
        >
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
          [target.configValue!]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card-editor": HuiMediaControlCardEditor;
  }
}
