import { severityMap } from "../../../common/style/severity_map";

export const computeSeverity = (sections, numberValue: number): string => {
  const sectionsArray = Object.keys(sections);
  const sortable = sectionsArray.map((severity) => [
    severity,
    sections[severity],
  ]);

  for (const severity of sortable) {
    if (severityMap[severity[0]] == null || isNaN(severity[1])) {
      return severityMap.normal;
    }
  }
  sortable.sort((a, b) => a[1] - b[1]);

  if (numberValue >= sortable[0][1] && numberValue < sortable[1][1]) {
    return severityMap[sortable[0][0]];
  }
  if (numberValue >= sortable[1][1] && numberValue < sortable[2][1]) {
    return severityMap[sortable[1][0]];
  }
  if (numberValue >= sortable[2][1]) {
    return severityMap[sortable[2][0]];
  }
  return severityMap.normal;
};
