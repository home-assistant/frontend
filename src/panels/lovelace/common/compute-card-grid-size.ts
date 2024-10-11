import { conditionalClamp } from "../../../common/number/clamp";
import { LovelaceLayoutOptions } from "../types";

export const DEFAULT_GRID_SIZE = {
  columns: 4,
  rows: "auto",
} as CardGridSize;

export type CardGridSize = {
  rows: number | "auto";
  columns: number | "full";
};

export const GRID_COLUMN_MULTIPLIER = 3;

export const computeCardGridSize = (
  options: LovelaceLayoutOptions
): CardGridSize => {
  const rows = options.grid_rows ?? DEFAULT_GRID_SIZE.rows;
  const columns = options.grid_columns ?? DEFAULT_GRID_SIZE.columns;
  const minRows = options.grid_min_rows;
  const maxRows = options.grid_max_rows;
  const minColumns = options.grid_min_columns;
  const maxColumns = options.grid_max_columns;
  const precisionMode = options.grid_precision_mode;

  const clampedRows =
    typeof rows === "string" ? rows : conditionalClamp(rows, minRows, maxRows);

  const clampedColumns =
    typeof columns === "string" || precisionMode
      ? columns
      : conditionalClamp(columns, minColumns, maxColumns) *
        GRID_COLUMN_MULTIPLIER;

  return {
    rows: clampedRows,
    columns: clampedColumns,
  };
};
