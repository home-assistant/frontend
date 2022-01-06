module.exports = [
  {
    category: "introduction",
    demos: ["introduction"],
  },

  {
    category: "lovelace",
    // Each section has a header
    header: "Lovelace",
    // Specify demos to make sure they are put on top.
    demos: [],
    // Add a demoStart to automatically gather demos based on their name
  },
  {
    category: "automation",
    header: "Automation",
  },
  {
    category: "components",
    header: "Components",
    demos: [
      "ha-alert",
      "ha-bar",
      "ha-chips",
      "ha-faded",
      "ha-form",
      "ha-label-badge",
      "ha-selector",
    ],
  },
  {
    category: "more-info",
    header: "More Info",
  },
  {
    category: "rest",
    header: "Rest",
  },
];
