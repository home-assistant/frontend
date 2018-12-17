import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { struct } from "../../common/structs/struct";
import { EntitiesEditorEvent, EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { Config } from "../../cards/hui-weather-forecast-card";
import { configElementStyle } from "./config-elements-style";

import "../../../../components/entity/ha-entity-picker";

const cardConfigStruct = struct({
  type: "string",
  entity: "string?",
  name: "string?",
});

export class HuiWeatherForecastCardEditor
  extends hassLocalizeLitMixin(LitElement)
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

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _name(): string {
    return this._config!.name || "";
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
            label="Name"
            .value="${this._name}"
            .configValue="${"name"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this._entity}"
            .configValue=${"entity"}
            domain-filter="weather"
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
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
    "hui-weather-forecast-card-editor": HuiWeatherForecastCardEditor;
  }
}

customElements.define(
  "hui-weather-forecast-card-editor",
  HuiWeatherForecastCardEditor
);
