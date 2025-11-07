import type { Condition } from "../../panels/lovelace/common/validate-condition";

/**
 * Extract media queries from conditions recursively
 */
export function extractMediaQueries(conditions: Condition[]): string[] {
  return conditions.reduce<string[]>((array, c) => {
    if ("conditions" in c && c.conditions) {
      array.push(...extractMediaQueries(c.conditions));
    }
    if (c.condition === "screen" && c.media_query) {
      array.push(c.media_query);
    }
    return array;
  }, []);
}
