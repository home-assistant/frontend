import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-input";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config } from "../../cards/hui-iframe-card";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = struct({
  type: "string",
  title: "string?",
  url: "string?",
  aspect_ratio: "string?",
});

export class HuiIframeCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);
    this._config = config;
  }

  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {} };
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
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <div class="side-by-side">
          <paper-input
            label="Title"
            .value="${this._title}"
            .configValue="${"title"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
            label="Aspect Ratio"
            type="number"
            .value="${Number(this._aspect_ratio.replace("%", ""))}"
            .configValue="${"aspect_ratio"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <paper-input
          label="Url"
          .value="${this._url}"
          .configValue="${"url"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    let value = target.value;

    if (target.configValue! === "aspect_ratio" && target.value) {
      value += "%";
    }

    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      this._config = { ...this._config, [target.configValue!]: value };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-iframe-card-editor": HuiIframeCardEditor;
  }
}

customElements.define("hui-iframe-card-editor", HuiIframeCardEditor);
