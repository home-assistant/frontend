import type { ViewColumnsCondition } from "../../common/validate-condition";

export const LARGE_SCREEN_CONDITION: ViewColumnsCondition = {
  condition: "view_columns",
  min: 2,
};

export const SMALL_SCREEN_CONDITION: ViewColumnsCondition = {
  condition: "view_columns",
  max: 1,
};
