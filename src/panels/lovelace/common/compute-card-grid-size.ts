import { conditionalClamp } from "../../../common/number/clamp";
import { LovelaceGridOptions, LovelaceLayoutOptions } from "../types";

export const GRID_COLUMN_MULTIPLIER = 3;

export const multiplyBy = <T extends number | string | undefined>(
  value: T,
  multiplier: number
): T => (typeof value === "number" ? ((value * multiplier) as T) : value);

export const divideBy = <T extends number | string | undefined>(
  value: T,
  divider: number
): T => (typeof value === "number" ? (Math.ceil(value / divider) as T) : value);

export const migrateLayoutToGridOptions = (
  options: LovelaceLayoutOptions
): LovelaceGridOptions => {
  const gridOptions: LovelaceGridOptions = {
    columns: multiplyBy(options.grid_columns, GRID_COLUMN_MULTIPLIER),
    max_columns: multiplyBy(options.grid_max_columns, GRID_COLUMN_MULTIPLIER),
    min_columns: multiplyBy(options.grid_min_columns, GRID_COLUMN_MULTIPLIER),
    rows: options.grid_rows,
    max_rows: options.grid_max_rows,
    min_rows: options.grid_min_rows,
  };
  for (const [key, value] of Object.entries(gridOptions)) {
    if (value === undefined) {
      delete gridOptions[key];
    }
  }
  return gridOptions;
};

export const DEFAULT_GRID_SIZE = {
  columns: 12,
  rows: "auto",
} as CardGridSize;

export type CardGridSize = {
  rows: number | "auto";
  columns: number | "full";
};

export const computeCardGridSize = (
  options: LovelaceGridOptions
): CardGridSize => {
  const rows = options.rows ?? DEFAULT_GRID_SIZE.rows;
  const columns = options.columns ?? DEFAULT_GRID_SIZE.columns;
  const minRows = options.min_rows;
  const maxRows = options.max_rows;
  const minColumns = options.min_columns;
  const maxColumns = options.max_columns;

  const clampedRows =
    typeof rows === "string" ? rows : conditionalClamp(rows, minRows, maxRows);

  const clampedColumns =
    typeof columns === "string"
      ? columns
      : conditionalClamp(columns, minColumns, maxColumns);

  return {
    rows: clampedRows,
    columns: clampedColumns,
  };
};
