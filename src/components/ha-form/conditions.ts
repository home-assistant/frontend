import { ensureArray } from "../../common/array/ensure-array";
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

const getConditionFields = (visible: HaFormVisible | undefined): string[] =>
  visible === undefined || typeof visible === "boolean"
    ? []
    : ensureArray(visible).flatMap((condition) =>
        "condition" in condition
          ? condition.conditions.flatMap((sub) => getConditionFields(sub))
          : [condition.field]
      );

// Hiding a field drops its value, which can flip another field's condition, so
// a field is evaluated after the fields its condition depends on.
export const getHiddenFields = (
  fields: readonly (readonly [string, HaFormVisible | undefined])[],
  data: HaFormDataContainer | undefined
): Set<string> => {
  const conditions = new Map(fields);
  const evalData: HaFormDataContainer = { ...(data ?? {}) };
  const hidden = new Set<string>();
  const resolved = new Set<string>();
  const resolve = (name: string) => {
    if (resolved.has(name) || !conditions.has(name)) {
      return;
    }
    resolved.add(name);
    const visible = conditions.get(name);
    getConditionFields(visible).forEach(resolve);
    if (!isVisible(visible, evalData)) {
      hidden.add(name);
      delete evalData[name];
    }
  };
  fields.forEach(([name]) => resolve(name));
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
