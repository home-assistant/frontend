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
  },
  {
    category: "lovelace",
    icon: mdiViewDashboard,
    // Label for in the sidebar
    header: "Dashboards",
    // Specify order of pages. Any pages in the category folder but not listed here will
    // automatically be added after the pages listed here.
    pages: ["introduction"],
  },
  {
    category: "more-info",
    icon: mdiInformationOutline,
    header: "More Info dialogs",
  },
  {
    category: "automation",
    icon: mdiRobot,
    header: "Automation",
    pages: [
      "editor-trigger",
      "editor-condition",
      "editor-action",
      "trace",
      "trace-timeline",
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
