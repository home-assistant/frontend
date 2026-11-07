import type {
  HaFormCondition,
  HaFormDataContainer,
  HaFormFieldCondition,
  HaFormSchema,
  HaFormVisible,
} from "./types";

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

const matchFieldCondition = (
  condition: HaFormFieldCondition,
  data: HaFormDataContainer | undefined
): boolean => {
  const actual = data?.[condition.field];
  switch (condition.operator ?? "eq") {
    case "eq":
      return actual === condition.value;
    case "not_eq":
      return actual !== condition.value;
    case "in":
      return (
        Array.isArray(condition.value) &&
        condition.value.includes(actual as any)
      );
    case "not_in":
      return (
        Array.isArray(condition.value) &&
        !condition.value.includes(actual as any)
      );
    case "exists":
      return !isEmpty(actual);
    case "not_exists":
      return isEmpty(actual);
    default:
      return false;
  }
};

export const evaluateCondition = (
  condition: HaFormCondition,
  data: HaFormDataContainer | undefined
): boolean => {
  if ("condition" in condition) {
    switch (condition.condition) {
      case "and":
        return condition.conditions.every((c) => evaluateCondition(c, data));
      case "or":
        return condition.conditions.some((c) => evaluateCondition(c, data));
      case "not":
        return !condition.conditions.some((c) => evaluateCondition(c, data));
      default:
        return false;
    }
  }
  return matchFieldCondition(condition, data);
};

export const isVisible = (
  visible: HaFormVisible | undefined,
  data: HaFormDataContainer | undefined
): boolean => {
  if (visible === undefined || visible === true) {
    return true;
  }
  if (visible === false) {
    return false;
  }
  const conditions = Array.isArray(visible) ? visible : [visible];
  return conditions.every((condition) => evaluateCondition(condition, data));
};

export const combineVisible = (
  ...options: (HaFormVisible | undefined)[]
): HaFormVisible => {
  const conditions: HaFormCondition[] = [];
  for (const visible of options) {
    if (visible === undefined || visible === true) {
      continue;
    }
    if (visible === false) {
      return false;
    }
    conditions.push(...(Array.isArray(visible) ? visible : [visible]));
  }
  return conditions;
};

// Hiding a field drops its value, which can flip another field's condition, so
// resolve the set to a fixpoint. Fields are given in order as name and visible.
export const getHiddenFields = (
  fields: readonly (readonly [string, HaFormVisible | undefined])[],
  data: HaFormDataContainer | undefined
): Set<string> => {
  const hidden = new Set<string>();
  const evalData: HaFormDataContainer = { ...(data ?? {}) };
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, visible] of fields) {
      if (hidden.has(name) || isVisible(visible, evalData)) {
        continue;
      }
      hidden.add(name);
      delete evalData[name];
      changed = true;
    }
  }
  return hidden;
};

export const getHiddenSchemaFields = (
  schema: readonly HaFormSchema[],
  data: HaFormDataContainer | undefined
): Set<string> =>
  getHiddenFields(
    schema.map((field) => [field.name, field.visible] as const),
    data
  );
