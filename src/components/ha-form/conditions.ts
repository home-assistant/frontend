import type {
  HaFormBaseSchema,
  HaFormCondition,
  HaFormDataContainer,
  HaFormFieldCondition,
  HaFormSchema,
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

export const isFieldVisible = (
  schema: HaFormSchema,
  data: HaFormDataContainer | undefined
): boolean => {
  const { visible } = schema as HaFormBaseSchema;
  if (visible === undefined || visible === true) {
    return true;
  }
  if (visible === false) {
    return false;
  }
  const conditions = Array.isArray(visible) ? visible : [visible];
  return conditions.every((condition) => evaluateCondition(condition, data));
};

// Hiding a field drops its value, which can flip another field's condition, so
// resolve the set to a fixpoint.
export const getHiddenFields = (
  schema: readonly HaFormSchema[],
  data: HaFormDataContainer | undefined
): Set<string> => {
  const hidden = new Set<string>();
  const evalData: HaFormDataContainer = { ...(data ?? {}) };
  let changed = true;
  while (changed) {
    changed = false;
    for (const field of schema) {
      if (hidden.has(field.name) || isFieldVisible(field, evalData)) {
        continue;
      }
      hidden.add(field.name);
      delete evalData[field.name];
      changed = true;
    }
  }
  return hidden;
};
