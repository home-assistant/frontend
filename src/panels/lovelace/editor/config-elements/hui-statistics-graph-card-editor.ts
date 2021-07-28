import "@polymer/paper-input/paper-input";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { array, assert, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import { StatisticsGraphCardConfig } from "../../cards/types";
import { LovelaceCardEditor } from "../../types";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";
import "../../../../components/entity/ha-statistics-picker";
import { processConfigEntities } from "../../common/process-config-entities";

const cardConfigStruct = object({
  type: string(),
  entities: array(entitiesConfigStruct),
  title: optional(string()),
  days_to_show: optional(number()),
});

@customElement("hui-statistics-graph-card-editor")
export class HuiStatisticsGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StatisticsGraphCardConfig;

  @state() private _configEntities?: string[];

  public setConfig(config: StatisticsGraphCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities
      ? processConfigEntities(config.entities).map((cfg) => cfg.entity)
      : [];
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _days_to_show(): number {
    return this._config!.days_to_show || 30;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._title}
          .configValue=${"title"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <div class="side-by-side">
          <paper-input
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.days_to_show"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._days_to_show}
            min="1"
            .configValue=${"days_to_show"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <ha-statistics-picker
          .hass=${this.hass}
          .pickStatisticLabel=${`Add a statistic`}
          .pickedStatisticLabel=${`Statistic`}
          .value=${this._configEntities}
          .configValue=${"entities"}
          @value-changed=${this._valueChanged}
        ></ha-statistics-picker>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    const newValue = ev.detail?.value || target.value;

    if (this[`_${target.configValue}`] === newValue) {
      return;
    }

    if (newValue === "") {
      this._config = { ...this._config };
      delete this._config[target.configValue!];
    } else {
      let value: any = newValue;
      if (target.type === "number") {
        value = Number(value);
      }
      this._config = {
        ...this._config,
        [target.configValue!]: value,
      };
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-statistics-graph-card-editor": HuiStatisticsGraphCardEditor;
  }
}
