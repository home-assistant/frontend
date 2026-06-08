import {
  mdiAccountGroup,
  mdiBookOpenPageVariant,
  mdiCalendarClock,
  mdiDotsHorizontal,
  mdiHome,
  mdiInformationOutline,
  mdiPalette,
  mdiPuzzle,
  mdiRobot,
  mdiTextBoxOutline,
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
    category: "lovelace",
    icon: mdiViewDashboard,
    // Label for in the sidebar
    header: "Dashboards",
    // Specify order of pages. Any pages in the category folder but not listed here will
    // automatically be added after the pages listed here.
    pages: ["introduction"],
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
    category: "components",
    icon: mdiPuzzle,
    header: "Components",
  },
  {
    category: "more-info",
    icon: mdiInformationOutline,
    header: "More Info dialogs",
  },
  {
    category: "misc",
    icon: mdiDotsHorizontal,
    header: "Miscellaneous",
  },
  {
    category: "brand",
    icon: mdiPalette,
    header: "Brand",
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
    category: "design.home-assistant.io",
    icon: mdiBookOpenPageVariant,
    header: "About",
  },
  {
    category: "Text",
    icon: mdiTextBoxOutline,
    header: "Text",
  },
];
