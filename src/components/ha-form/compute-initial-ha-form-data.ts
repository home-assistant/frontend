import type { Selector } from "../../data/selector";
import type { HaFormSchema } from "./types";

export const computeInitialHaFormData = (
  schema: HaFormSchema[]
): Record<string, any> => {
  const data = {};
  schema.forEach((field) => {
    if (
      field.description?.suggested_value !== undefined &&
      field.description?.suggested_value !== null
    ) {
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
    } else if ("selector" in field) {
      const selector: Selector = field.selector;

      if ("device" in selector) {
        data[field.name] = selector.device.multiple ? [] : "";
      } else if ("entity" in selector) {
        data[field.name] = selector.entity.multiple ? [] : "";
      } else if ("area" in selector) {
        data[field.name] = selector.area.multiple ? [] : "";
      } else if ("boolean" in selector) {
        data[field.name] = false;
      } else if (
        "text" in selector ||
        "addon" in selector ||
        "attribute" in selector ||
        "file" in selector ||
        "icon" in selector ||
        "theme" in selector
      ) {
        data[field.name] = "";
      } else if ("number" in selector) {
        data[field.name] = selector.number.min ?? 0;
      } else if ("select" in selector) {
        if (selector.select.options.length) {
          data[field.name] = selector.select.options[0][0];
        }
      } else if ("duration" in selector) {
        data[field.name] = {
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      } else if ("time" in selector) {
        data[field.name] = "00:00:00";
      } else if ("date" in selector || "datetime" in selector) {
        const now = new Date().toISOString().slice(0, 10);
        data[field.name] = `${now} 00:00:00`;
      } else if ("color_rgb" in selector) {
        data[field.name] = [0, 0, 0];
      } else if ("color_temp" in selector) {
        data[field.name] = selector.color_temp.min_mireds ?? 153;
      } else if (
        "action" in selector ||
        "media" in selector ||
        "target" in selector
      ) {
        data[field.name] = {};
      } else {
        throw new Error("Selector not supported in initial form data");
      }
    }
  });
  return data;
};
