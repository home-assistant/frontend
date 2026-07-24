import { stripBoundaryLabel } from "../string/strip_boundary_label";

export interface AreaForNameMatch {
  area_id: string;
  name: string;
  aliases?: string[];
}

export interface DeviceAreaSuggestion {
  name: string;
  area?: string;
}

const areaLabels = (area: AreaForNameMatch): string[] =>
  [area.name, ...(area.aliases ?? [])].filter(Boolean);

// Longest matching label (name or alias) of a single area, and the device name
// once that label is stripped off. `null` when the area does not match.
const matchArea = (
  name: string,
  area: AreaForNameMatch
): { strippedName: string; labelLength: number } | null => {
  let best: { strippedName: string; labelLength: number } | null = null;
  for (const label of areaLabels(area)) {
    const strippedName = stripBoundaryLabel(name, label);
    if (strippedName === null) {
      continue;
    }
    if (!best || label.length > best.labelLength) {
      best = { strippedName, labelLength: label.length };
    }
  }
  return best;
};

// The area with the longest matching label, and the stripped device name.
const bestAreaMatch = (
  name: string,
  areas: AreaForNameMatch[]
): { areaId: string; strippedName: string; labelLength: number } | null => {
  let best: {
    areaId: string;
    strippedName: string;
    labelLength: number;
  } | null = null;
  for (const area of areas) {
    const match = matchArea(name, area);
    if (match && (!best || match.labelLength > best.labelLength)) {
      best = { areaId: area.area_id, ...match };
    }
  }
  return best;
};

/**
 * Suggests a cleaned device name (and an area) when an area name or alias is a
 * prefix or suffix of the device name.
 *
 * - When the device already has an area, only match against that area, so an
 *   assigned area is never overridden — just the name is cleaned.
 * - Otherwise pick the area with the longest matching name/alias and suggest it.
 * - The longest match wins with no fallback: if the name is exactly the area,
 *   nothing is left to keep and the result is a no-op (`null`).
 */
export const computeDeviceAreaSuggestion = (
  deviceName: string | null | undefined,
  currentAreaId: string | null | undefined,
  areas: AreaForNameMatch[]
): DeviceAreaSuggestion | null => {
  const name = deviceName?.trim();
  if (!name) {
    return null;
  }

  if (currentAreaId) {
    const area = areas.find((a) => a.area_id === currentAreaId);
    const match = area ? matchArea(name, area) : null;
    return match?.strippedName ? { name: match.strippedName } : null;
  }

  const match = bestAreaMatch(name, areas);
  return match?.strippedName
    ? { name: match.strippedName, area: match.areaId }
    : null;
};
