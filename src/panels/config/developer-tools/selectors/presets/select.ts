import type { SelectorVariant } from ".";

const SELECT_OPTIONS_SIMPLE = [
  "Option 1",
  "Option 2",
  "Option 3",
  "Option 4",
  "Option 5",
  "Option 6",
];

const SELECT_OPTIONS_SHORT = SELECT_OPTIONS_SIMPLE.slice(0, 4);

export const SELECT_DEFAULT_CONFIG: Record<string, unknown> = {
  options: SELECT_OPTIONS_SIMPLE,
};

export const SELECT_VARIANTS: SelectorVariant[] = [
  {
    id: "dropdown",
    name: "Dropdown",
    config: { options: SELECT_OPTIONS_SIMPLE },
  },
  {
    id: "list",
    name: "List (radios)",
    config: { mode: "list", options: SELECT_OPTIONS_SHORT },
  },
  {
    id: "box",
    name: "Box",
    config: { mode: "box", options: SELECT_OPTIONS_SHORT },
  },
  {
    id: "custom_value",
    name: "Custom value (searchable)",
    config: { custom_value: true, options: SELECT_OPTIONS_SIMPLE },
  },
  {
    id: "multiple",
    name: "Multiple (chips)",
    config: { multiple: true, options: SELECT_OPTIONS_SIMPLE },
  },
  {
    id: "multiple_list",
    name: "Multiple (checkboxes)",
    config: {
      mode: "list",
      multiple: true,
      options: SELECT_OPTIONS_SHORT,
    },
  },
  {
    id: "multiple_reorder",
    name: "Multiple with reorder",
    config: {
      multiple: true,
      reorder: true,
      options: SELECT_OPTIONS_SIMPLE,
    },
  },
  {
    id: "multiple_custom",
    name: "Multiple with custom value",
    config: {
      multiple: true,
      custom_value: true,
      options: SELECT_OPTIONS_SIMPLE,
    },
  },
  {
    id: "disabled_options",
    name: "With disabled options",
    config: {
      options: [
        { label: "Option 1", value: "option_1" },
        { label: "Option 2", value: "option_2" },
        { label: "Option 3 (disabled)", value: "option_3", disabled: true },
        { label: "Option 4", value: "option_4" },
      ],
    },
  },
  {
    id: "sorted",
    name: "Sorted",
    config: {
      sort: true,
      options: ["Charlie", "Alpha", "Echo", "Bravo", "Delta"],
    },
  },
];
