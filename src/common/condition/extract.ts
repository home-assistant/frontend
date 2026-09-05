import type {
  TimeCondition,
  VisibilityCondition,
} from "../../panels/lovelace/common/validate-condition";

/**
 * Extract media queries from conditions recursively
 */
export function extractMediaQueries(
  conditions: VisibilityCondition[]
): string[] {
  return conditions.reduce<string[]>((array, c) => {
    if ("conditions" in c && c.conditions) {
      array.push(...extractMediaQueries(c.conditions));
    }
    if (
      "condition" in c &&
      c.condition === "screen" &&
      "media_query" in c &&
      c.media_query
    ) {
      array.push(c.media_query);
    }
    return array;
  }, []);
}

/**
 * Extract time conditions from conditions recursively
 */
export function extractTimeConditions(
  conditions: VisibilityCondition[]
): TimeCondition[] {
  return conditions.reduce<TimeCondition[]>((array, c) => {
    if ("conditions" in c && c.conditions) {
      array.push(...extractTimeConditions(c.conditions));
    }
    if ("condition" in c && c.condition === "time") {
      // Dashboard `time` is always the client-side lovelace shape; core `time`
      // is intentionally excluded from VisibilityCondition.
      array.push(c as TimeCondition);
    }
    return array;
  }, []);
}
