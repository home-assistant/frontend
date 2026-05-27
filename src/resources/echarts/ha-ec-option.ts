import type { TemplateResult } from "lit";
import type { TooltipOption } from "echarts/types/dist/shared";
import type { ECOption } from "./echarts";

export type LitTooltipFormatter<P = any> = (
  params: P,
  ticket?: string
) => TemplateResult | typeof import("lit").nothing | null | undefined;

export type HaTooltipOption = Omit<TooltipOption, "formatter"> & {
  formatter?: string | LitTooltipFormatter;
};

type RawSeriesOption = Exclude<
  NonNullable<ECOption["series"]>,
  readonly unknown[]
>;

/** Single series item with optional Lit tooltip formatter */
export type HaECSeriesItem = Omit<RawSeriesOption, "tooltip"> & {
  tooltip?: HaTooltipOption;
};

/** Series array passed to ha-chart-base `.data` */
export type HaECSeries = HaECSeriesItem[];

export type HaECOption = Omit<ECOption, "tooltip" | "series"> & {
  tooltip?: HaTooltipOption | HaTooltipOption[];
  series?: HaECSeriesItem | HaECSeriesItem[];
};
