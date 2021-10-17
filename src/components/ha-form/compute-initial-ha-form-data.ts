import { HaFormSchema } from "./types";

export const computeInitialHaFormData = (
  schema: HaFormSchema[]
): Record<string, any> => {
  const data = {};
  schema.forEach((field) => {
    if (field.description?.suggested_value) {
      data[field.name] = field.description.suggested_value;
    } else if ("default" in field) {
      data[field.name] = field.default;
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
        data[field.name] = field.options[0][0];
      }
    } else if (field.type === "positive_time_period_dict") {
      data[field.name] = {
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }
  });
  return data;
};
