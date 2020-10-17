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
import { HomeAssistant } from "../../../../types";
import { IframeCardConfig } from "../../cards/types";
import { LovelaceCardEditor } from "../../types";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = object({
  type: string(),
  title: optional(string()),
  url: optional(string()),
  aspect_ratio: optional(string()),
});

@customElement("hui-iframe-card-editor")
export class HuiIframeCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: IframeCardConfig;

  public setConfig(config: IframeCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _url(): string {
    return this._config!.url || "";
  }

  get _aspect_ratio(): string {
    return this._config!.aspect_ratio || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.url"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .value="${this._url}"
          .configValue="${"url"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.title"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._title}"
            .configValue="${"title"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.aspect_ratio"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._aspect_ratio}"
            .configValue="${"aspect_ratio"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = target.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      if (value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = { ...this._config, [target.configValue!]: value };
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
    "hui-iframe-card-editor": HuiIframeCardEditor;
  }
}
