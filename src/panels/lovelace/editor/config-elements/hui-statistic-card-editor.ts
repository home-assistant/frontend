import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { any, assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../../common/translations/localize";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import {
  getStatisticMetadata,
  StatisticsMetaData,
  statisticsMetaHasType,
  StatisticType,
} from "../../../../data/recorder";
import type { HomeAssistant } from "../../../../types";
import type { StatisticCardConfig } from "../../cards/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    unit: optional(string()),
    stat_type: optional(string()),
    period: optional(any()),
    theme: optional(string()),
    footer: optional(headerFooterConfigStructs),
  })
);

const stat_types = ["mean", "min", "max", "change"] as const;

const statTypeMap: Record<(typeof stat_types)[number], StatisticType> = {
  mean: "mean",
  min: "min",
  max: "max",
  change: "sum",
};

const periods = {
  today: { calendar: { period: "day" } },
  yesterday: { calendar: { period: "day", offset: -1 } },
  this_week: { calendar: { period: "week" } },
  last_week: { calendar: { period: "week", offset: -1 } },
  this_month: { calendar: { period: "month" } },
  last_month: { calendar: { period: "month", offset: -1 } },
  this_year: { calendar: { period: "year" } },
  last_year: { calendar: { period: "year", offset: -1 } },
} as const;

@customElement("hui-statistic-card-editor")
export class HuiStatisticCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StatisticCardConfig;

  @state() private _metadata?: StatisticsMetaData;

  public setConfig(config: StatisticCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._fetchMetadata();
  }

  firstUpdated() {
    this._fetchMetadata().then(() => {
      if (!this._config?.stat_type && this._config?.entity) {
        fireEvent(this, "config-changed", {
          config: {
            ...this._config,
            stat_type: this._metadata?.has_sum ? "change" : "mean",
          },
        });
      }
    });
  }

  private _data = memoizeOne((config: StatisticCardConfig) => {
    if (!config || !config.period) {
      return config;
    }
    for (const [periodKey, period] of Object.entries(periods)) {
      if (deepEqual(period, config.period)) {
        return { ...config, period: periodKey };
      }
    }
    return config;
  });

  private _schema = memoizeOne(
    (
      selectedPeriodKey: string | undefined,
      localize: LocalizeFunc,
      metadata?: StatisticsMetaData
    ) =>
      [
        { name: "entity", required: true, selector: { statistic: {} } },
        {
          name: "stat_type",
          required: true,
          selector: {
            select: {
              multiple: false,
              options: stat_types.map((stat_type) => ({
                value: stat_type,
                label: localize(
                  `ui.panel.lovelace.editor.card.statistic.stat_type_labels.${stat_type}`
                ),
                disabled:
                  !metadata ||
                  !statisticsMetaHasType(metadata, statTypeMap[stat_type]),
              })),
            },
          },
        },
        {
          name: "period",
          required: true,
          selector:
            selectedPeriodKey &&
            Object.keys(periods).includes(selectedPeriodKey)
              ? {
                  select: {
                    multiple: false,
                    options: Object.keys(periods).map((periodKey) => ({
                      value: periodKey,
                      label:
                        localize(
                          `ui.panel.lovelace.editor.card.statistic.periods.${periodKey}`
                        ) || periodKey,
                    })),
                  },
                }
              : { object: {} },
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "name", selector: { text: {} } },
            {
              name: "icon",
              selector: {
                icon: {},
              },
              context: {
                icon_entity: "entity",
              },
            },
            { name: "unit", selector: { text: {} } },
            { name: "theme", selector: { theme: {} } },
          ],
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = this._data(this._config);

    const schema = this._schema(
      typeof data.period === "string" ? data.period : undefined,
      this.hass.localize,
      this._metadata
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private async _fetchMetadata() {
    if (!this.hass || !this._config) {
      return;
    }
    this._metadata = (
      await getStatisticMetadata(this.hass, [this._config.entity])
    )[0];
  }

  private async _valueChanged(ev: CustomEvent) {
    const config = { ...ev.detail.value } as StatisticCardConfig;
    Object.keys(config).forEach((k) => config[k] === "" && delete config[k]);

    if (typeof config.period === "string") {
      const period = periods[config.period];
      if (period) {
        config.period = period;
      }
    }

    if (
      config.stat_type &&
      config.entity &&
      config.entity !== this._metadata?.statistic_id
    ) {
      const metadata = (
        await getStatisticMetadata(this.hass!, [config.entity])
      )?.[0];
      if (metadata && !metadata.has_sum && config.stat_type === "change") {
        config.stat_type = "mean";
      }
      if (metadata && !metadata.has_mean && config.stat_type !== "change") {
        config.stat_type = "change";
      }
    }

    if (!config.stat_type && config.entity) {
      const metadata = (
        await getStatisticMetadata(this.hass!, [config.entity])
      )?.[0];
      config.stat_type = metadata?.has_sum ? "change" : "mean";
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    if (schema.name === "period") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.statistic.period"
      );
    }

    if (schema.name === "theme") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.theme"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.optional"
      )})`;
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-statistic-card-editor": HuiStatisticCardEditor;
  }
}
