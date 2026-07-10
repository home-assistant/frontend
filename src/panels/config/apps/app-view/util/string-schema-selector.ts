import type { Selector } from "../../../../../data/selector";

export const MASKED_FIELDS = ["password", "secret", "token"];

export interface StringSchemaEntry {
  name: string;
  multiple?: boolean;
  format?: "email" | "password" | "url";
  options?: string[];
}

export const stringSchemaEntrySelector = (
  entry: StringSchemaEntry
): Selector => {
  if (entry.multiple) {
    return {
      select: {
        options: entry.options ?? [],
        multiple: true,
        custom_value: true,
      },
    };
  }
  // Single-value fields keep the text selector even when options are
  // available: the single-value custom_value picker cannot store an empty
  // string (clearing emits undefined, dropping the key on save), which
  // would silently change stored-value semantics versus the text field.
  return {
    text: {
      type: entry.format
        ? entry.format
        : MASKED_FIELDS.includes(entry.name)
          ? "password"
          : "text",
    },
  };
};
