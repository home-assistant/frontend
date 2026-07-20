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

export const isFieldHidden = (
  schema: HaFormSchema,
  data: HaFormDataContainer | undefined
): boolean => {
  const { hidden } = schema as HaFormBaseSchema;
  if (!hidden) {
    return false;
  }
  if (hidden === true) {
    return true;
  }
  const conditions = Array.isArray(hidden) ? hidden : [hidden];
  return conditions.every((condition) => evaluateCondition(condition, data));
};

// A hidden field holds no value, so it reads as absent to the conditions of the
// other fields. Visibility is resolved until it is stable.
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
      if (hidden.has(field.name) || !isFieldHidden(field, evalData)) {
        continue;
      }
      hidden.add(field.name);
      delete evalData[field.name];
      changed = true;
    }
  }
  return hidden;
};
