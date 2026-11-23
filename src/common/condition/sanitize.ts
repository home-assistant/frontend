import type { VisibilityCondition } from "../../panels/lovelace/common/validate-condition";
import { ensureArray } from "../array/ensure-array";

// YAML dashboards can hold entries like `- ` (null) or a bare string.
const isConditionObject = (c: unknown): c is VisibilityCondition =>
  typeof c === "object" && c !== null;

/**
 * Drop entries that are not condition objects, at any depth. A single
 * condition mapping is wrapped in an array. Returns the same array when it
 * is an array and every entry is valid.
 */
export const dropInvalidConditions = (
  conditions: VisibilityCondition | VisibilityCondition[]
): VisibilityCondition[] => {
  const list = ensureArray(conditions);
  let changed = list !== conditions;
  const valid: VisibilityCondition[] = [];
  for (const c of list) {
    if (!isConditionObject(c)) {
      changed = true;
      continue;
    }
    if ("conditions" in c && c.conditions != null) {
      const children = ensureArray(c.conditions);
      const validChildren = dropInvalidConditions(children);
      if (validChildren !== children) {
        changed = true;
        valid.push({ ...c, conditions: validChildren } as VisibilityCondition);
        continue;
      }
    }
    valid.push(c);
  }
  return changed ? valid : list;
};
