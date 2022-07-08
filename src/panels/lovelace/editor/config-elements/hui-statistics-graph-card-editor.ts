import "../../../../components/ha-form/ha-form";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
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
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/entity/ha-statistics-picker";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { StatisticsGraphCardConfig } from "../../cards/types";
import { processConfigEntities } from "../../common/process-config-entities";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";

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

const periods = ["5minute", "hour", "day", "month"] as const;

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

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "period",
              required: true,
              selector: {
                select: {
                  options: periods.map((period) => ({
                    value: period,
                    label: localize(
                      `ui.panel.lovelace.editor.card.statistics-graph.periods.${period}`
                    ),
                  })),
                },
              },
            },
            {
              name: "days_to_show",
              required: true,
              selector: { number: { min: 1, mode: "box" } },
            },
            {
              name: "stat_types",
              required: true,
              type: "multi_select",
              options: [
                ["mean", "Mean"],
                ["min", "Min"],
                ["max", "Max"],
                ["sum", "Sum"],
              ],
            },
            {
              name: "chart_type",
              required: true,
              type: "select",
              options: [
                ["line", "Line"],
                ["bar", "Bar"],
              ],
            },
          ],
        },
      ] as const
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const schema = this._schema(this.hass.localize);
    const stat_types = this._config!.stat_types
      ? Array.isArray(this._config!.stat_types)
        ? this._config!.stat_types
        : [this._config!.stat_types]
      : ["mean", "min", "max", "sum"];
    const data = {
      chart_type: "line",
      period: "hour",
      days_to_show: 30,
      ...this._config,
      stat_types,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
        <ha-statistics-picker
          .hass=${this.hass}
          .pickStatisticLabel=${`Add a statistic`}
          .pickedStatisticLabel=${`Statistic`}
          .value=${this._configEntities}
          .configValue=${"entities"}
          @value-changed=${this._entitiesChanged}
        ></ha-statistics-picker>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _entitiesChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", {
      config: { ...this._config!, entities: ev.detail.value },
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "chart_type":
      case "stat_types":
      case "period":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.statistics-graph.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static styles: CSSResultGroup = css`
    ha-statistics-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-statistics-graph-card-editor": HuiStatisticsGraphCardEditor;
  }
}
