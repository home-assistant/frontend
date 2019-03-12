import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
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

@customElement("hui-iframe-card-editor")
export class HuiIframeCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;

  @property() private _config?: Config;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);
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

  protected render(): TemplateResult | void {
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
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        this._config = { ...this._config, [target.configValue!]: value };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-iframe-card-editor": HuiIframeCardEditor;
  }
}
