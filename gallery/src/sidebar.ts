import { DEMOS } from "../build/import-demos";

export const SIDEBAR: SidebarSection[] = [
  {
    demos: ["introduction"],
  },

  {
    // Each section has a header
    header: "Lovelace",
    // Specify demos to make sure they are put on top.
    demos: [],
    // Add a demoStart to automatically gather demos based on their name
    demoStart: "hui-",
  },
  {
    header: "Automation",
    demoStart: "automation-",
  },
  {
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
    header: "More Info",
    demoStart: "more-info-",
  },
  {
    header: "Rest",
    demoStart: "", // empty string matches all.
  },
];

interface SidebarSection {
  header?: string;
  demos?: string[];
  demoStart?: string;
}

const demosToProcess = new Set(Object.keys(DEMOS));

for (const group of Object.values(SIDEBAR)) {
  // Any pre-defined groups will not be sorted.
  if (group.demos) {
    for (const demo of group.demos) {
      demosToProcess.delete(demo);
    }
  } else {
    group.demos = [];
  }
}
for (const group of Object.values(SIDEBAR)) {
  if (group.demoStart !== undefined) {
    for (const demo of demosToProcess) {
      if (demo.startsWith(group.demoStart)) {
        group.demos!.push(demo);
        demosToProcess.delete(demo);
      }
    }
  }
}
