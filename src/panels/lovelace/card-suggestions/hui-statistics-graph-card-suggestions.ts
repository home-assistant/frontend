import { computeDomain } from "../../../common/entity/compute_domain";
import type { StatisticsGraphCardConfig } from "../cards/types";
import type { CardSuggestion, CardSuggestionProvider } from "./types";

const LABEL_PREFIX = "ui.panel.lovelace.editor.cardpicker.suggestions.periods.";

interface Variant {
  labelKey: string;
  days_to_show: number;
  period: "hour" | "day" | "month";
  chart_type: "line" | "bar";
  stat_types: ("mean" | "min" | "max" | "change")[];
}

const MEASUREMENT_VARIANTS: Variant[] = [
  {
    labelKey: "last_24h",
    days_to_show: 1,
    period: "hour",
    chart_type: "line",
    stat_types: ["mean"],
  },
  {
    labelKey: "last_7d",
    days_to_show: 7,
    period: "day",
    chart_type: "line",
    stat_types: ["mean", "min", "max"],
  },
  {
    labelKey: "last_30d",
    days_to_show: 30,
    period: "day",
    chart_type: "line",
    stat_types: ["mean", "min", "max"],
  },
];

const TOTAL_VARIANTS: Variant[] = [
  {
    labelKey: "last_7d",
    days_to_show: 7,
    period: "day",
    chart_type: "bar",
    stat_types: ["change"],
  },
  {
    labelKey: "last_30d",
    days_to_show: 30,
    period: "day",
    chart_type: "bar",
    stat_types: ["change"],
  },
  {
    labelKey: "last_year",
    days_to_show: 365,
    period: "month",
    chart_type: "bar",
    stat_types: ["change"],
  },
];

export const statisticsGraphCardSuggestions: CardSuggestionProvider<StatisticsGraphCardConfig> =
  {
    getEntitySuggestion(hass, entityId) {
      if (computeDomain(entityId) !== "sensor") return null;
      const stateObj = hass.states[entityId];
      const stateClass = stateObj?.attributes.state_class;
      if (!stateClass) return null;
      const variants =
        stateClass === "measurement" ? MEASUREMENT_VARIANTS : TOTAL_VARIANTS;
      const suggestions: CardSuggestion<StatisticsGraphCardConfig>[] =
        variants.map((v) => ({
          label: hass.localize(`${LABEL_PREFIX}${v.labelKey}` as any),
          config: {
            type: "statistics-graph",
            entities: [entityId],
            days_to_show: v.days_to_show,
            period: v.period,
            chart_type: v.chart_type,
            stat_types: v.stat_types,
          },
        }));
      return suggestions;
    },
  };
