// Preset variants for the `select` selector, grouped by the UI branch of
// `ha-selector-select` that they exercise:
//
//   - Dropdown  : <ha-select>         (single, mode=dropdown or auto >= 6)
//   - List      : <ha-radio> / <ha-checkbox>
//                                     (mode=list, no reorder/custom_value)
//   - Box       : <ha-select-box>     (single, mode=box)
//   - Chips     : <ha-chip-set> + <ha-generic-picker>
//                                     (multiple)
//   - Picker    : <ha-generic-picker> (single + custom_value)
//
// Configs mirror real usage from the codebase where applicable, e.g.:
//   - Box multi-column: frontend/src/panels/lovelace/editor/view-header/
//     hui-view-header-settings-editor.ts
//   - Box with images/descriptions: frontend/src/panels/config/integrations/
//     integration-panels/zwave_js/add-node/zwave-js-add-node-configure-device.ts
//   - Single-column box with descriptions: .../zwave-js-add-node-select-
//     security-strategy.ts
//   - Chips with reorder + custom value: frontend/src/panels/lovelace/editor/
//     config-elements/hui-area-card-editor.ts

import type { SelectorVariantGroup } from ".";

const SELECT_OPTIONS_SIMPLE = [
  "Option 1",
  "Option 2",
  "Option 3",
  "Option 4",
  "Option 5",
  "Option 6",
];

const SELECT_OPTIONS_SHORT = SELECT_OPTIONS_SIMPLE.slice(0, 4);

const DISABLED_OPTIONS = [
  { label: "Option 1", value: "option_1" },
  { label: "Option 2", value: "option_2" },
  { label: "Option 3 (disabled)", value: "option_3", disabled: true },
  { label: "Option 4", value: "option_4" },
];

// Options whose values line up with the `demo_select` localizer in
// developer-tools-selectors.ts so the `translation_key` preset shows visible
// relabeling in the preview.
const TRANSLATION_KEY_OPTIONS = [
  { value: "option_1", label: "Option 1 (raw)" },
  { value: "option_2", label: "Option 2 (raw)" },
  { value: "option_3", label: "Option 3 (raw)" },
  { value: "option_4", label: "Option 4 (raw)" },
];

export const SELECT_DEFAULT_CONFIG: Record<string, unknown> = {
  options: SELECT_OPTIONS_SIMPLE,
};

export const SELECT_VARIANT_GROUPS: SelectorVariantGroup[] = [
  {
    id: "dropdown",
    label: "Dropdown",
    variants: [
      {
        id: "dropdown",
        name: "Basic",
        config: { mode: "dropdown", options: SELECT_OPTIONS_SIMPLE },
      },
      {
        id: "dropdown_sorted",
        name: "Sorted",
        config: {
          mode: "dropdown",
          sort: true,
          options: ["Charlie", "Alpha", "Echo", "Bravo", "Delta"],
        },
      },
      {
        id: "dropdown_disabled_options",
        name: "With disabled option",
        config: { mode: "dropdown", options: DISABLED_OPTIONS },
      },
      {
        id: "dropdown_auto_from_count",
        name: "Auto-selected for 6+ options",
        config: { options: SELECT_OPTIONS_SIMPLE },
      },
      {
        id: "dropdown_translation_key",
        name: "translation_key (relabels via localizeValue)",
        config: {
          mode: "dropdown",
          translation_key: "demo_select",
          options: TRANSLATION_KEY_OPTIONS,
        },
      },
    ],
  },
  {
    id: "list",
    label: "List",
    variants: [
      {
        id: "list_radios",
        name: "Radios",
        config: { mode: "list", options: SELECT_OPTIONS_SHORT },
      },
      {
        id: "list_radios_disabled",
        name: "Radios with disabled option",
        config: { mode: "list", options: DISABLED_OPTIONS },
      },
      {
        id: "list_checkboxes",
        name: "Checkboxes (multiple)",
        config: {
          mode: "list",
          multiple: true,
          options: SELECT_OPTIONS_SHORT,
        },
      },
      {
        id: "list_auto_from_count",
        name: "Auto-selected for <6 options",
        config: { options: SELECT_OPTIONS_SHORT },
      },
    ],
  },
  {
    id: "box",
    label: "Box",
    variants: [
      {
        id: "box_basic",
        name: "Basic",
        config: { mode: "box", options: SELECT_OPTIONS_SHORT },
      },
      {
        id: "box_multi_column",
        name: "Multi-column",
        config: {
          mode: "box",
          box_max_columns: 3,
          options: [
            {
              value: "responsive",
              label: "Responsive",
              description: "Fill the available width responsively.",
            },
            {
              value: "start",
              label: "Start",
              description: "Align content to the start of the container.",
            },
            {
              value: "center",
              label: "Center",
              description: "Center content in the container.",
            },
          ],
        },
      },
      {
        id: "box_single_column_descriptions",
        name: "Single column with descriptions",
        config: {
          mode: "box",
          box_max_columns: 1,
          options: [
            {
              value: "default",
              label: "Default",
              description:
                "Use the highest security protocol advertised by the device.",
            },
            {
              value: "s2",
              label: "Security S2",
              description:
                "Use Security S2 for this inclusion (requires compatible hardware).",
            },
            {
              value: "s0",
              label: "Security S0",
              description: "Use Security S0 for this inclusion (legacy).",
            },
            {
              value: "insecure",
              label: "Insecure",
              description: "Skip encryption entirely. Not recommended.",
            },
          ],
        },
      },
      {
        id: "box_with_images",
        name: "With images (object form)",
        config: {
          mode: "box",
          box_max_columns: 1,
          options: [
            {
              value: "long_range",
              label: "Long Range",
              description:
                "High-bandwidth, star-topology network with per-device ranges of several kilometers.",
              image: {
                src: "/static/images/z-wave-add-node/long-range.svg",
                src_dark: "/static/images/z-wave-add-node/long-range_dark.svg",
                flip_rtl: true,
              },
            },
            {
              value: "mesh",
              label: "Mesh",
              description:
                "Traditional mesh network where devices route traffic for each other.",
              image: {
                src: "/static/images/z-wave-add-node/mesh.svg",
                src_dark: "/static/images/z-wave-add-node/mesh_dark.svg",
                flip_rtl: true,
              },
            },
          ],
        },
      },
      {
        id: "box_image_string",
        name: "With image (string form)",
        config: {
          mode: "box",
          box_max_columns: 1,
          options: [
            {
              value: "ohf",
              label: "Open Home Foundation",
              description: "image is a plain URL string, not an object.",
              image: "/static/images/ohf-badge.svg",
            },
            {
              value: "none",
              label: "None",
              description: "An option without an image for contrast.",
            },
          ],
        },
      },
      {
        id: "box_two_columns",
        name: "Two columns",
        config: {
          mode: "box",
          box_max_columns: 2,
          options: SELECT_OPTIONS_SHORT,
        },
      },
      {
        id: "box_disabled_option",
        name: "With disabled option",
        config: {
          mode: "box",
          box_max_columns: 2,
          options: DISABLED_OPTIONS,
        },
      },
    ],
  },
  {
    id: "chips",
    label: "Chips",
    variants: [
      {
        id: "chips_basic",
        name: "Basic (multiple)",
        config: { multiple: true, options: SELECT_OPTIONS_SIMPLE },
      },
      {
        id: "chips_reorder",
        name: "Reorder",
        config: {
          multiple: true,
          reorder: true,
          options: SELECT_OPTIONS_SIMPLE,
        },
      },
      {
        id: "chips_custom_value",
        name: "Custom value",
        config: {
          multiple: true,
          custom_value: true,
          options: SELECT_OPTIONS_SIMPLE,
        },
      },
      {
        id: "chips_reorder_custom_value",
        name: "Reorder + custom value",
        config: {
          multiple: true,
          reorder: true,
          custom_value: true,
          options: SELECT_OPTIONS_SIMPLE,
        },
      },
      {
        id: "chips_sorted",
        name: "Sorted",
        config: {
          multiple: true,
          sort: true,
          options: ["Charlie", "Alpha", "Echo", "Bravo", "Delta"],
        },
      },
      {
        id: "chips_disabled_option",
        name: "With disabled option",
        config: {
          multiple: true,
          options: DISABLED_OPTIONS,
        },
      },
      {
        id: "chips_list_mode_reorder",
        name: "mode:list + reorder (falls through to chips)",
        config: {
          mode: "list",
          multiple: true,
          reorder: true,
          options: SELECT_OPTIONS_SIMPLE,
        },
      },
      {
        id: "chips_box_mode",
        name: "mode:box + multiple (falls through to chips)",
        config: {
          mode: "box",
          multiple: true,
          options: SELECT_OPTIONS_SIMPLE,
        },
      },
    ],
  },
  {
    id: "picker",
    label: "Picker",
    variants: [
      {
        id: "picker_custom_value",
        name: "Custom value (searchable)",
        config: { custom_value: true, options: SELECT_OPTIONS_SIMPLE },
      },
      {
        id: "picker_list_mode",
        name: "mode:list + custom_value (falls through to picker)",
        config: {
          mode: "list",
          custom_value: true,
          options: SELECT_OPTIONS_SIMPLE,
        },
      },
    ],
  },
];
