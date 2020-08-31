import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "./config-elements-style";
import { assert } from "superstruct";

import {
  GraphHeaderFooterConfig,
  graphHeaderFooterConfigStruct,
} from "../../header-footer/types";
import type { EditorTarget, EntitiesEditorEvent } from "../types";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceCardEditor } from "../../types";

import "../../../../components/entity/ha-entity-picker";

const includeDomains = ["sensor"];

@customElement("hui-graph-footer-editor")
export class HuiGraphFooterEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: GraphHeaderFooterConfig;

  public setConfig(config: GraphHeaderFooterConfig): void {
    assert(config, graphHeaderFooterConfigStruct);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _detail(): number {
    return this._config!.detail || 1;
  }

  get _hours_to_show(): number {
    return this._config!.hours_to_show || 24;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <ha-entity-picker
          allow-custom-entity
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})"
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          .includeDomains=${includeDomains}
          @change=${this._valueChanged}
        ></ha-entity-picker>
        <div class="side-by-side">
          <paper-input
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.sensor.graph_detail"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._detail}
            .configValue=${"detail"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <paper-input
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hours_to_show"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._hours_to_show}
            .configValue=${"hours_to_show"}
            @value-changed=${this._valueChanged}
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

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (
        target.value === "" ||
        (target.type === "number" && isNaN(Number(target.value)))
      ) {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        let value: any = target.value;
        if (target.type === "number") {
          value = Number(value);
        }
        this._config = { ...this._config, [target.configValue!]: value };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-footer-editor": HuiGraphFooterEditor;
  }
}
