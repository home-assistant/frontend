import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert } from "superstruct";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-formfield";
import "../../../../components/ha-switch";
import "../../../../components/ha-textfield";
import type { HomeAssistant } from "../../../../types";
import { graphHeaderFooterConfigStruct } from "../../header-footer/structs";
import { GraphHeaderFooterConfig } from "../../header-footer/types";
import type { LovelaceCardEditor } from "../../types";
import type { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const includeDomains = ["sensor"];

@customElement("hui-graph-footer-editor")
export class HuiGraphFooterEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GraphHeaderFooterConfig;

  public setConfig(config: GraphHeaderFooterConfig): void {
    assert(config, graphHeaderFooterConfigStruct);
    this._config = config;
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _detail(): number {
    return this._config!.detail ?? 1;
  }

  get _hours_to_show(): number {
    return this._config!.hours_to_show || 24;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <div class="card-config">
        <ha-entity-picker
          allow-custom-entity
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
          )}
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${"entity"}
          .includeDomains=${includeDomains}
          .required=${true}
          @change=${this._valueChanged}
        ></ha-entity-picker>
        <div class="side-by-side">
          <ha-formfield
            label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.sensor.show_more_detail"
            )}
          >
            <ha-switch
              .checked=${this._detail === 2}
              .configValue=${"detail"}
              @change=${this._change}
            ></ha-switch>
          </ha-formfield>
          <ha-textfield
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hours_to_show"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._hours_to_show}
            min="1"
            .configValue=${"hours_to_show"}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>
      </div>
    `;
  }

  private _change(ev: Event) {
    if (!this._config || !this.hass) {
      return;
    }

    const value = (ev.target! as EditorTarget).checked ? 2 : 1;

    if (this._detail === value) {
      return;
    }

    this._config = {
      ...this._config,
      detail: value,
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _valueChanged(ev: HASSDomEvent<EntitiesEditorEvent>): void {
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

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-footer-editor": HuiGraphFooterEditor;
  }
}
