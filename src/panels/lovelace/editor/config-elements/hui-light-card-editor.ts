import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-input";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config } from "../../cards/hui-light-card";
import { configElementStyle } from "./config-elements-style";

import "../../components/hui-theme-select-editor";
import "../../components/hui-entity-editor";

const cardConfigStruct = struct({
  type: "string",
  name: "string?",
  entity: "string?",
  theme: "string?",
});

export class HuiLightCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;

  public setConfig(config: Config): void {
    config = cardConfigStruct(config);

    this._config = { type: "light", ...config };
  }

  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {}, _configEntities: {} };
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

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          label="Name"
          .value="${this._name}"
          .configValue="${"name"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="side-by-side">
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this._entity}"
            .configValue=${"entity"}
            .domainFilter=${"light"}
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
          <hui-theme-select-editor
            .hass="${this.hass}"
            .value="${this._theme}"
            .configValue="${"theme"}"
            @theme-changed="${this._valueChanged}"
          ></hui-theme-select-editor>
        </div>
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
      this._config = {
        ...this._config,
        [target.configValue!]: target.value,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-card-editor": HuiLightCardEditor;
  }
}

customElements.define("hui-light-card-editor", HuiLightCardEditor);
