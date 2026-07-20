import {
  mdiAccountGroup,
  mdiCalendarClock,
  mdiDotsHorizontal,
  mdiHome,
  mdiInformationOutline,
  mdiPalette,
  mdiPuzzle,
  mdiRobot,
  mdiViewDashboard,
} from "@mdi/js";

// A group may list its pages flat in `pages`, or group them under named
// `subsections`. The two are mutually exclusive. Listed pages keep their order;
// any pages found in the category but not listed are appended alphabetically
// (to a generated "Other" subsection when the group uses subsections).
export default [
  {
    // This section has no header and so all page links are shown directly in the sidebar
    category: "concepts",
    icon: mdiHome,
    pages: ["home"],
  },

  {
    category: "brand",
    icon: mdiPalette,
    header: "Brand",
  },
  {
    category: "components",
    icon: mdiPuzzle,
    header: "Components",
    subsections: [
      {
        header: "Form and selectors",
        pages: [
          "ha-form",
          "ha-selector",
          "ha-select-box",
          "ha-input",
          "ha-textarea",
        ],
      },
      {
        header: "Controls and sliders",
        pages: [
          "ha-button",
          "ha-control-button",
          "ha-progress-button",
          "ha-switch",
          "ha-control-switch",
          "ha-slider",
          "ha-control-slider",
          "ha-control-circular-slider",
          "ha-control-number-buttons",
          "ha-control-select",
          "ha-control-select-menu",
          "ha-hs-color-picker",
        ],
      },
      {
        header: "Overlays",
        pages: [
          "ha-dialog",
          "ha-dialogs",
          "ha-adaptive-dialog",
          "ha-adaptive-popover",
          "ha-dropdown",
          "ha-tooltip",
        ],
      },
      {
        header: "Lists and disclosure",
        pages: ["ha-list", "ha-expansion-panel", "ha-faded"],
      },
      {
        header: "Feedback and status",
        pages: ["ha-alert", "ha-spinner", "ha-tip", "ha-bar", "ha-gauge"],
      },
      {
        header: "Labels and text",
        pages: ["ha-badge", "ha-label-badge", "ha-chips", "ha-marquee-text"],
      },
    ],
  },
  {
    category: "lovelace",
    icon: mdiViewDashboard,
    // Label for in the sidebar
    header: "Dashboards",
    subsections: [
      {
        header: "Introduction",
        pages: ["introduction"],
      },
      {
        header: "Entity cards",
        pages: [
          "entities-card",
          "entity-button-card",
          "entity-filter-card",
          "glance-card",
          "tile-card",
          "area-card",
        ],
      },
      {
        header: "Picture cards",
        pages: [
          "picture-card",
          "picture-elements-card",
          "picture-entity-card",
          "picture-glance-card",
        ],
      },
      {
        header: "Domain cards",
        pages: [
          "light-card",
          "thermostat-card",
          "alarm-panel-card",
          "gauge-card",
          "plant-card",
          "map-card",
          "media-control-card",
          "media-player-row",
        ],
      },
      {
        header: "Layout and utility",
        pages: [
          "grid-and-stack-card",
          "conditional-card",
          "iframe-card",
          "markdown-card",
          "todo-list-card",
        ],
      },
    ],
  },
  {
    category: "more-info",
    icon: mdiInformationOutline,
    header: "More Info dialogs",
    subsections: [
      {
        header: "Climate and water",
        pages: ["climate", "humidifier", "water-heater", "fan"],
      },
      {
        header: "Covers and access",
        pages: ["cover", "lock", "lawn-mower", "vacuum"],
      },
      {
        header: "Lighting",
        pages: ["light", "scene"],
      },
      {
        header: "Media",
        pages: ["media-player"],
      },
      {
        header: "Inputs and values",
        pages: ["input-number", "input-text", "number", "timer"],
      },
      {
        header: "System",
        pages: ["update"],
      },
    ],
  },
  {
    category: "automation",
    icon: mdiRobot,
    header: "Automation",
    subsections: [
      {
        header: "Editors",
        pages: ["editor-trigger", "editor-condition", "editor-action"],
      },
      {
        header: "Descriptions",
        pages: ["describe-trigger", "describe-condition", "describe-action"],
      },
      {
        header: "Traces",
        pages: ["trace", "trace-timeline"],
      },
    ],
  },
  {
    category: "user-test",
    icon: mdiAccountGroup,
    header: "Users",
    pages: ["user-types", "configuration-menu"],
  },
  {
    category: "date-time",
    icon: mdiCalendarClock,
    header: "Date and Time",
    subsections: [
      {
        header: "Date",
        pages: ["date"],
      },
      {
        header: "Time",
        pages: ["time", "time-seconds", "time-weekday"],
      },
      {
        header: "Combined",
        pages: [
          "date-time",
          "date-time-numeric",
          "date-time-seconds",
          "date-time-short",
          "date-time-short-year",
        ],
      },
    ],
  },
  {
    category: "misc",
    icon: mdiDotsHorizontal,
    header: "Miscellaneous",
    pages: [
      "entity-state",
      "ha-markdown",
      "integration-card",
      "box-shadow",
      "util-long-press",
      "remove-delete-add-create",
      "editing",
    ],
  },
];
