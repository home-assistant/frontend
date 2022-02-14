import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  assign,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/ha-statistics-picker";
import "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-radio";
import type { HaRadio } from "../../../../components/ha-radio";
import { StatisticType } from "../../../../data/history";
import { HomeAssistant } from "../../../../types";
import { StatisticsGraphCardConfig } from "../../cards/types";
import { processConfigEntities } from "../../common/process-config-entities";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

const statTypeStruct = union([
  literal("sum"),
  literal("min"),
  literal("max"),
  literal("mean"),
]);

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: array(entitiesConfigStruct),
    title: optional(string()),
    days_to_show: optional(number()),
    period: optional(
      union([
        literal("5minute"),
        literal("hour"),
        literal("day"),
        literal("month"),
      ])
    ),
    chart_type: optional(union([literal("bar"), literal("line")])),
    stat_types: optional(union([array(statTypeStruct), statTypeStruct])),
  })
);

const periods = ["5minute", "hour", "day", "month"];

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
      ? processConfigEntities(config.entities, false).map((cfg) => cfg.entity)
      : [];
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _days_to_show(): number {
    return this._config!.days_to_show || 30;
  }

  get _period(): string {
    return this._config!.period || "hour";
  }

  get _chart_type(): StatisticsGraphCardConfig["chart_type"] {
    return this._config!.chart_type || "line";
  }

  get _stat_types(): StatisticType[] {
    return this._config!.stat_types
      ? Array.isArray(this._config!.stat_types)
        ? this._config!.stat_types
        : [this._config!.stat_types]
      : ["mean", "min", "max", "sum"];
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
          <mwc-select
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.statistics-graph.period"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .configValue=${"period"}
            @selected=${this._periodSelected}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
            .value=${this._period}
          >
            ${periods.map(
              (period) =>
                html`<mwc-list-item .value=${period}>
                  ${this.hass!.localize(
                    `ui.panel.lovelace.editor.card.statistics-graph.periods.${period}`
                  )}
                </mwc-list-item>`
            )}
          </mwc-select>
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
        <p>Show stat types:</p>
        <div class="side-by-side">
          <ha-formfield label="Sum">
            <ha-checkbox
              .checked=${this._stat_types.includes("sum")}
              name="sum"
              @change=${this._statTypesChanged}
            ></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="Mean">
            <ha-checkbox
              .checked=${this._stat_types.includes("mean")}
              name="mean"
              @change=${this._statTypesChanged}
            ></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="Min">
            <ha-checkbox
              .checked=${this._stat_types.includes("min")}
              name="min"
              @change=${this._statTypesChanged}
            ></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="Max">
            <ha-checkbox
              .checked=${this._stat_types.includes("max")}
              name="max"
              @change=${this._statTypesChanged}
            ></ha-checkbox>
          </ha-formfield>
        </div>
        <div class="side-by-side">
          <p>Chart type:</p>
          <ha-formfield label="Line">
            <ha-radio
              .checked=${this._chart_type === "line"}
              value="line"
              name="chart_type"
              @change=${this._chartTypeChanged}
            ></ha-radio>
          </ha-formfield>
          <ha-formfield label="Bar">
            <ha-radio
              .checked=${this._chart_type === "bar"}
              value="bar"
              name="chart_type"
              @change=${this._chartTypeChanged}
            ></ha-radio>
          </ha-formfield>
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

  private _chartTypeChanged(ev: CustomEvent) {
    const input = ev.currentTarget as HaRadio;
    fireEvent(this, "config-changed", {
      config: { ...this._config!, chart_type: input.value },
    });
  }

  private _statTypesChanged(ev) {
    const name = ev.currentTarget.name;
    const checked = ev.currentTarget.checked;
    if (checked) {
      fireEvent(this, "config-changed", {
        config: { ...this._config!, stat_types: [...this._stat_types, name] },
      });
      return;
    }
    const statTypes = [...this._stat_types];
    fireEvent(this, "config-changed", {
      config: {
        ...this._config!,
        stat_types: statTypes.filter((stat) => stat !== name),
      },
    });
  }

  private _periodSelected(ev) {
    const newPeriod = ev.target.value
      .period as StatisticsGraphCardConfig["period"];
    if (newPeriod === this._period) {
      return;
    }
    fireEvent(this, "config-changed", {
      config: { ...this._config!, period: newPeriod },
    });
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
    return [
      configElementStyle,
      css`
        ha-statistics-picker {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-statistics-graph-card-editor": HuiStatisticsGraphCardEditor;
  }
}
