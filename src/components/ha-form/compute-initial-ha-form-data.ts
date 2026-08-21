import { getSelectorInitialValue } from "./get-selector-initial-value";
import type { HaFormData, HaFormSchema } from "./types";

const setDefaultValue = (
  field: HaFormSchema,
  value: HaFormData | undefined
) => {
  if ("selector" in field && "choose" in field.selector) {
    const firstChoice = Object.keys(field.selector.choose.choices)[0];
    if (firstChoice) {
      return {
        active_choice: firstChoice,
        [firstChoice]: value,
      };
    }
  }
  return value;
};

export const computeInitialHaFormData = (
  schema: HaFormSchema[] | readonly HaFormSchema[]
): Record<string, any> => {
  const data = {};
  schema.forEach((field) => {
    if (
      field.description?.suggested_value !== undefined &&
      field.description?.suggested_value !== null
    ) {
      data[field.name] = setDefaultValue(
        field,
        field.description.suggested_value
      );
    } else if ("default" in field) {
      data[field.name] = setDefaultValue(field, field.default);
    } else if (field.type === "expandable") {
      const expandableData = computeInitialHaFormData(field.schema);
      if (field.required || Object.keys(expandableData).length) {
        // Only add expandable data if it's required or any of its children have initial values.
        data[field.name] = expandableData;
      }
    } else if (!field.required) {
      // Do nothing.
    } else if (field.type === "boolean") {
      data[field.name] = false;
    } else if (field.type === "string") {
      data[field.name] = "";
    } else if (field.type === "integer") {
      data[field.name] = "valueMin" in field ? field.valueMin : 0;
    } else if (field.type === "constant") {
      data[field.name] = field.value;
    } else if (field.type === "float") {
      data[field.name] = 0.0;
    } else if (field.type === "select") {
      if (field.options.length) {
        const val = field.options[0];
        data[field.name] = Array.isArray(val) ? val[0] : val;
      }
    } else if (field.type === "positive_time_period_dict") {
      data[field.name] = {
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    } else if ("selector" in field) {
      const initialValue = getSelectorInitialValue(field.selector);
      if (initialValue !== undefined) {
        data[field.name] = initialValue;
      }
    }
  });
  return data;
};
