import { DEMOS } from "../build/import-demos";

export const SIDEBAR: SidebarSection[] = [
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

interface SidebarSection {
  category: string;
  header?: string;
  demos?: string[];
}

const demosToProcess: Record<string, Set<string>> = {};
for (const key of Object.keys(DEMOS)) {
  const [category, demo] = key.split("/", 2);
  if (!(category in demosToProcess)) {
    demosToProcess[category] = new Set();
  }
  demosToProcess[category].add(demo);
}

for (const group of Object.values(SIDEBAR)) {
  const toProcess = demosToProcess[group.category];
  delete demosToProcess[group.category];

  if (!toProcess) {
    console.error("Unknown category", group.category);
    continue;
  }

  // Any pre-defined groups will not be sorted.
  if (group.demos) {
    for (const demo of group.demos) {
      if (!toProcess.delete(demo)) {
        console.error("Found unreferenced demo", demo);
      }
    }
  } else {
    group.demos = [];
  }
  for (const demo of Array.from(toProcess).sort()) {
    group.demos!.push(demo);
  }
}

for (const [category, demos] of Object.entries(demosToProcess)) {
  SIDEBAR.push({
    category,
    demos: Array.from(demos),
  });
}
