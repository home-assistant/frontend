import type {
  Condition,
  ScreenCondition,
} from "../../common/validate-condition";

export const LARGE_SCREEN_CONDITION: ScreenCondition = {
  condition: "screen",
  media_query: "(min-width: 871px)",
};

export const SMALL_SCREEN_CONDITION: Condition = {
  condition: "not",
  conditions: [LARGE_SCREEN_CONDITION],
};
