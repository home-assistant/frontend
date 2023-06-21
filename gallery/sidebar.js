export default [
  {
    // This section has no header and so all page links are shown directly in the sidebar
    category: "concepts",
    pages: ["home"],
  },

  {
    category: "lovelace",
    // Label for in the sidebar
    header: "Dashboards",
    // Specify order of pages. Any pages in the category folder but not listed here will
    // automatically be added after the pages listed here.
    pages: ["introduction"],
  },
  {
    category: "automation",
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
    header: "Components",
  },
  {
    category: "more-info",
    header: "More Info dialogs",
  },
  {
    category: "misc",
    header: "Miscellaneous",
  },
  {
    category: "brand",
    header: "Brand",
  },
  {
    category: "user-test",
    header: "Users",
    pages: ["user-types", "configuration-menu"],
  },
  {
    category: "date-time",
    header: "Date and Time",
  },
  {
    category: "design.home-assistant.io",
    header: "About",
  },
];
