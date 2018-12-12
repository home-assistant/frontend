import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-input";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config } from "../../cards/hui-picture-card";
import { configElementStyle } from "./config-elements-style";
import { ActionConfig } from "../../../../data/lovelace";

import "../../components/hui-action-editor";

const cardConfigStruct = struct({
  type: "string",
  image: "string?",
  tap_action: "object?",
  hold_action: "object?",
});

export class HuiPictureCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);

    this._config = {
      type: "alarm-panel",
      ...config,
    };
  }

  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {} };
  }

  get _image(): string {
    return this._config!.image || "";
  }

  get _tap_action(): ActionConfig {
    return this._config!.tap_action || { action: "more-info" };
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "none" };
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          label="Image Url"
          .value="${this._image}"
          .configValue="${"image"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="side-by-side">
          <hui-action-editor
            .label="${"Tap Action"}"
            .hass="${this.hass}"
            .config="${this._tap_action}"
            .configValue="${"tap_action"}"
            @action-changed="${this._valueChanged}"
          ></hui-action-editor>
          <hui-action-editor
            .label="${"Hold Action"}"
            .hass="${this.hass}"
            .config="${this._hold_action}"
            .configValue="${"hold_action"}"
            @action-changed="${this._valueChanged}"
          ></hui-action-editor>
        </div>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (
      this[`_${target.configValue}`] === target.value ||
      this[`_${target.configValue}`] === target.config
    ) {
      return;
    }
    if (target.configValue) {
      this._config = {
        ...this._config,
        [target.configValue!]: target.value ? target.value : target.config,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-card-editor": HuiPictureCardEditor;
  }
}

customElements.define("hui-picture-card-editor", HuiPictureCardEditor);
