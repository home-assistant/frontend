/**
 * Builds a section of a workflow run's summary: a heading, a table of rows and
 * the warnings raised along the way.
 *
 * Warnings are also logged as annotations, so a script can report problems
 * without failing its step.
 */

import type { AnnotationProperties, Core } from "./github-script.d.ts";

interface SummaryOptions {
  heading: string;
  columns: string[];
  // Shown instead of the table when no rows were added
  empty: string;
}

export const createSummary = (
  core: Core,
  { heading, columns, empty }: SummaryOptions
) => {
  const rows: string[][] = [];
  const warnings: string[] = [];

  return {
    addRow: (...cells: string[]) => {
      rows.push(cells);
    },

    warn: (message: string, properties?: AnnotationProperties) => {
      core.warning(message, properties);
      warnings.push(message);
    },

    write: async () => {
      core.summary.addHeading(heading, 2);

      if (rows.length > 0) {
        core.summary.addTable([
          columns.map((data) => ({ data, header: true })),
          ...rows,
        ]);
      } else {
        core.summary.addRaw(`${empty}\n`);
      }

      if (warnings.length > 0) {
        core.summary
          .addHeading("Warnings", 3)
          .addRaw(`${warnings.map((warning) => `- ${warning}`).join("\n")}\n`);
      }

      await core.summary.write();
    },
  };
};
