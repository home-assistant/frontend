import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { ensureArray } from "../../../../common/array/ensure-array";
import {
  type HASSDomEvent,
  fireEvent,
} from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { deepEqual } from "../../../../common/util/deep-equal";
import { supportedStatTypeMap } from "../../../../components/chart/statistics-chart";
import "../../../../components/entity/ha-statistics-picker";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type {
  StatisticsMetaData,
  StatisticType,
} from "../../../../data/recorder";
import {
  getDisplayUnit,
  getStatisticMetadata,
  isExternalStatistic,
  statisticsMetaHasType,
} from "../../../../data/recorder";
import type { EntityConfig } from "../../entity-rows/types";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_DAYS_TO_SHOW } from "../../cards/hui-statistics-graph-card";
import type {
  GraphEntityConfig,
  StatisticsGraphCardConfig,
} from "../../cards/types";
import { processConfigEntities } from "../../common/process-config-entities";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { graphEntitiesConfigStruct } from "../structs/entities-struct";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";
import { orderPropertiesGraphCard } from "./order-properties/order-properties-graph";

const statTypeStruct = union([
  literal("state"),
  literal("sum"),
  literal("change"),
  literal("min"),
  literal("max"),
  literal("mean"),
]);

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: array(graphEntitiesConfigStruct),
    title: optional(string()),
    days_to_show: optional(number()),
    period: optional(
      union([
        literal("5minute"),
        literal("hour"),
        literal("day"),
        literal("week"),
        literal("month"),
        literal("year"),
        literal("auto"),
      ])
    ),
    chart_type: optional(
      union([
        literal("line"),
        literal("line-stack"),
        literal("bar"),
        literal("bar-stack"),
      ])
    ),
    stat_types: optional(union([array(statTypeStruct), statTypeStruct])),
    unit: optional(string()),
    hide_legend: optional(boolean()),
    expand_legend: optional(boolean()),
    logarithmic_scale: optional(boolean()),
    min_y_axis: optional(number()),
    max_y_axis: optional(number()),
    fit_y_data: optional(boolean()),
    energy_date_selection: optional(boolean()),
    collection_key: optional(string()),
  })
);

const chartTypes = ["line", "line-stack", "bar", "bar-stack"] as const;
const periods = ["5minute", "hour", "day", "week", "month", "year"] as const;
const energyPeriods = [...periods, "auto"] as const;

const stat_types = [
  "mean",
  "min",
  "max",
  "sum",
  "state",
  "change",
] as StatisticType[];

@customElement("hui-statistics-graph-card-editor")
export class HuiStatisticsGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StatisticsGraphCardConfig;

  @state() private _configEntities?: string[];

  @state() private _metaDatas?: StatisticsMetaData[];

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: StatisticsGraphCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities
      ? processConfigEntities(config.entities, false).map((cfg) => cfg.entity)
      : [];
  }

  private _getStatisticsMetaData = async (statisticIds?: string[]) => {
    this._metaDatas = await getStatisticMetadata(
      this.hass!,
      statisticIds || []
    );
  };

  public willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("_configEntities") &&
      !deepEqual(this._configEntities, changedProps.get("_configEntities"))
    ) {
      this._metaDatas = undefined;
      if (this._configEntities?.length) {
        this._getStatisticsMetaData(this._configEntities);
      }
    }
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      statisticIds: string[] | undefined,
      metaDatas: StatisticsMetaData[] | undefined,
      showFitOption: boolean,
      hiddenLegend: boolean,
      enableDateSelect: boolean
    ) => {
      const units = new Set<string>();
      metaDatas?.forEach((metaData) => {
        const unit = getDisplayUnit(
          this.hass!,
          metaData.statistic_id,
          metaData
        );
        if (unit) {
          units.add(unit);
        }
      });
      const schema: HaFormSchema[] = [
        { name: "title", selector: { text: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "chart_type",
                  required: true,
                  type: "select",
                  options: chartTypes.map((type) => [
                    type,
                    localize(
                      `ui.panel.lovelace.editor.card.statistics-graph.chart_type_labels.${type}`
                    ),
                  ]),
                },
                ...(!enableDateSelect
                  ? ([
                      {
                        name: "days_to_show",
                        default: DEFAULT_DAYS_TO_SHOW,
                        selector: { number: { min: 1, mode: "box" } },
                      },
                    ] as HaFormSchema[])
                  : []),
              ],
            },
            {
              name: "period",
              required: true,
              selector: {
                select: {
                  mode: "list",
                  options: (enableDateSelect ? energyPeriods : periods).map(
                    (period) => ({
                      value: period,
                      label: localize(
                        `ui.panel.lovelace.editor.card.statistics-graph.periods.${period}`
                      ),
                      disabled:
                        // External statistics don't support 5-minute statistics.
                        period === "5minute" &&
                        statisticIds?.some((statistic_id) =>
                          isExternalStatistic(statistic_id)
                        ),
                    })
                  ),
                },
              },
            },
          ],
        },
        {
          name: "",
          type: "grid",
          schema: [
            ...(enableDateSelect
              ? ([
                  {
                    type: "string",
                    name: "collection_key",
                    required: false,
                  },
                ] as HaFormSchema[])
              : []),
            {
              name: "energy_date_selection",
              required: false,
              selector: { boolean: {} },
            },
          ],
        },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "stat_types",
              required: true,
              selector: {
                select: {
                  multiple: true,
                  mode: "list",
                  options: stat_types.map((stat_type) => ({
                    value: stat_type,
                    label: localize(
                      `ui.panel.lovelace.editor.card.statistics-graph.stat_type_labels.${stat_type}`
                    ),
                    disabled:
                      !metaDatas ||
                      !metaDatas.some((metaData) =>
                        statisticsMetaHasType(
                          metaData,
                          supportedStatTypeMap[stat_type]
                        )
                      ),
                  })),
                },
              },
            },
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "min_y_axis",
                  required: false,
                  selector: { number: { mode: "box", step: "any" } },
                },
                {
                  name: "max_y_axis",
                  required: false,
                  selector: { number: { mode: "box", step: "any" } },
                },
                ...(showFitOption
                  ? [
                      {
                        name: "fit_y_data",
                        required: false,
                        selector: { boolean: {} },
                      },
                    ]
                  : []),
                {
                  name: "logarithmic_scale",
                  required: false,
                  selector: { boolean: {} },
                },
                {
                  name: "hide_legend",
                  required: false,
                  selector: { boolean: {} },
                },
                ...(!hiddenLegend
                  ? [
                      {
                        name: "expand_legend",
                        required: false,
                        selector: { boolean: {} },
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        ...(units.size > 1
          ? [
              {
                name: "unit",
                required: false,
                selector: {
                  select: {
                    options: Array.from(units).map((unit) => ({
                      value: unit,
                      label: unit,
                    })),
                  },
                },
              },
            ]
          : []),
      ];

      return schema;
    }
  );

  private _subForm = memoizeOne((localize: LocalizeFunc) => ({
    schema: [
      { name: "entity", required: true, selector: { statistic: {} } },
      {
        name: "name",
        selector: { entity_name: {} },
        context: {
          entity: "entity",
        },
      },
      {
        name: "color",
        selector: { ui_color: {} },
      },
    ] as const,
    computeLabel: (item: HaFormSchema) => {
      switch (item.name) {
        case "entity":
          return localize(
            "ui.panel.lovelace.editor.card.statistics-graph.picked_statistic"
          );
        case "name":
        case "color":
          return localize(`ui.panel.lovelace.editor.card.generic.${item.name}`);
        default:
          return undefined;
      }
    },
  }));

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .form=${this._subForm(this.hass.localize)}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubEntityChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const schema = this._schema(
      this.hass.localize,
      this._configEntities,
      this._metaDatas,
      this._config!.min_y_axis !== undefined ||
        this._config!.max_y_axis !== undefined,
      !!this._config!.hide_legend,
      !!this._config!.energy_date_selection
    );
    const configured_stat_types = this._config!.stat_types
      ? ensureArray(this._config.stat_types)
      : stat_types.filter((stat_type) =>
          this._metaDatas?.some((metaData) =>
            statisticsMetaHasType(metaData, stat_type)
          )
        );
    const data = {
      chart_type: "line",
      period: this._config!.energy_date_selection ? "auto" : "hour",
      ...this._config,
      stat_types: configured_stat_types,
    };
    const unitClass = this._metaDatas?.[0]?.unit_class;
    const statisticsUnit = unitClass
      ? undefined
      : this._metaDatas?.[0]?.statistics_unit_of_measurement;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-statistics-picker
        .hass=${this.hass}
        .placeholder=${this.hass!.localize(
          "ui.panel.lovelace.editor.card.statistics-graph.pick_statistic"
        )}
        .label=${this.hass!.localize(
          "ui.panel.lovelace.editor.card.statistics-graph.picked_statistic"
        )}
        .includeStatisticsUnitOfMeasurement=${statisticsUnit}
        .includeUnitClass=${unitClass}
        .ignoreRestrictionsOnFirstStatistic=${true}
        .value=${this._configEntities}
        .configValue=${"entities"}
        can-edit
        @value-changed=${this._entitiesChanged}
        @edit-detail-element=${this._editDetailElement}
      ></ha-statistics-picker>
    `;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    const index = ev.detail.subElementConfig.index!;
    let elementConfig = this._config!.entities[index];
    if (typeof elementConfig === "string") {
      elementConfig = { entity: elementConfig };
    }
    this._subElementEditorConfig = {
      ...ev.detail.subElementConfig,
      ...{ elementConfig: elementConfig as EntityConfig },
    };
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = this._orderProperties(ev.detail.value);
    fireEvent(this, "config-changed", { config });
  }

  private async _entitiesChanged(ev: CustomEvent): Promise<void> {
    const newEntityIds = ev.detail.value;

    // Save the EntityConfig objects from being replaced with strings
    const newEntities = newEntityIds.map((newEnt) => {
      const matchEntity = this._config!.entities.find(
        (oldEnt) => typeof oldEnt !== "string" && oldEnt.entity === newEnt
      );
      return matchEntity ?? newEnt;
    });

    let config = { ...this._config!, entities: newEntities };

    // remove inappropriate stat options dependently on entities
    config = await this._cleanConfig(config);
    // normalize a generated yaml code
    config = this._orderProperties(config);

    fireEvent(this, "config-changed", {
      config,
    });
  }

  private async _handleSubEntityChanged(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();

    // get updated entity config
    const newEntityConfig = ev.detail.config as GraphEntityConfig;

    // update card config with updated entity config
    const index = this._subElementEditorConfig!.index!;
    const newEntities = [...this._config!.entities];
    newEntities[index] = newEntityConfig;
    let config = this._config!;
    config = { ...config, entities: newEntities };

    // remove inappropriate stat options dependently on entities
    config = await this._cleanConfig(config);
    // normalize a generated yaml code
    config = this._orderProperties(config);
    this._config = config;

    // update sub-element editor config
    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: {
        ...(this._config!.entities[index] as GraphEntityConfig),
      },
    };

    fireEvent(this, "config-changed", { config });
  }

  // remove inappropriate stat options dependently on entities
  private async _cleanConfig(
    config: StatisticsGraphCardConfig
  ): Promise<StatisticsGraphCardConfig> {
    const entityIds = config.entities.map((entityConf) => {
      if (typeof entityConf === "string") {
        return entityConf;
      }
      return entityConf.entity ?? undefined;
    });
    if (
      entityIds.some((statistic_id) => isExternalStatistic(statistic_id)) &&
      config.period === "5minute"
    ) {
      delete config.period;
    }
    const metadata =
      config.stat_types || config.unit
        ? await getStatisticMetadata(this.hass!, entityIds)
        : undefined;
    if (config.stat_types && config.entities.length) {
      config.stat_types = ensureArray(config.stat_types).filter((stat_type) =>
        metadata!.some((metaData) => statisticsMetaHasType(metaData, stat_type))
      );
      if (!config.stat_types.length) {
        delete config.stat_types;
      }
    }
    if (
      config.unit &&
      !metadata!.some(
        (metaData) =>
          getDisplayUnit(this.hass!, metaData?.statistic_id, metaData) ===
          config.unit
      )
    ) {
      delete config.unit;
    }

    return config;
  }

  // normalize a generated yaml code by placing lines in a consistent order
  private _orderProperties(
    config: StatisticsGraphCardConfig
  ): StatisticsGraphCardConfig {
    return orderPropertiesGraphCard(
      config,
      cardConfigStruct
    ) as StatisticsGraphCardConfig;
  }

  private _computeHelperCallback = (schema) => {
    switch (schema.name) {
      case "collection_key":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.collection_key_description`
        );
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (schema) => {
    switch (schema.name) {
      case "chart_type":
      case "stat_types":
      case "period":
      case "unit":
      case "hide_legend":
      case "expand_legend":
      case "logarithmic_scale":
      case "min_y_axis":
      case "max_y_axis":
      case "fit_y_data":
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
