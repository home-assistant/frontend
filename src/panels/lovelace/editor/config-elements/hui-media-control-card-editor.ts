import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-theme-picker";
import { HomeAssistant } from "../../../../types";
import { MediaControlCardConfig } from "../../cards/types";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditorTarget, EntitiesEditorEvent } from "../types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    theme: optional(string()),
  })
);

const includeDomains = ["media_player"];

@customElement("hui-media-control-card-editor")
export class HuiMediaControlCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MediaControlCardConfig;

  public setConfig(config: MediaControlCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
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
          .includeDomains=${includeDomains}
          .required=${true}
          @change=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        <ha-theme-picker
          .label=${`${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.theme"
          )} (${this.hass!.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})`}
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></ha-theme-picker>
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
        this._config = { ...this._config };
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
    "hui-media-control-card-editor": HuiMediaControlCardEditor;
  }
}
