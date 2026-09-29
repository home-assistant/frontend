// Lets a Home Assistant theme repaint the map.
//
// MapLibre draws to WebGL, so a CSS custom property cannot reach it the way it
// reaches every other component: the values have to be read here and handed to
// the style builder. Same approach ha-chart-base takes for ECharts.
//
// These tokens override; they do not define. A theme that sets none leaves the
// shipped palette alone, which is also what keeps the generated style file in
// use instead of building one in the browser.

/**
 * Theme token -> the @versatiles/style colors it paints. One token covers
 * several keys: a theme author sets a handful, not forty-five. A card's own
 * `colors` still wins over whatever a theme says.
 */
const MAP_THEME_TOKENS: Record<string, readonly string[]> = {
  "--ha-color-map-land": ["background", "land"],
  "--ha-color-map-water": ["water"],
  "--ha-color-map-green": [
    "naturePark",
    "natureWood",
    "natureGrass",
    "natureLeisure",
    "natureWetland",
    "siteSports",
  ],
  "--ha-color-map-area": [
    "areaResidential",
    "areaCommercial",
    "areaIndustrial",
    "areaWaste",
    "areaBurial",
    "siteParking",
    "natureAgriculture",
    "natureSand",
    "natureRock",
  ],
  "--ha-color-map-building": ["building"],
  "--ha-color-map-building-outline": ["buildingBg"],
  "--ha-color-map-road": ["roadStreet"],
  "--ha-color-map-road-major": ["roadMotorway", "roadTrunk"],
  "--ha-color-map-road-outline": [
    "roadStreetBg",
    "roadTrunkBg",
    "roadMotorwayBg",
  ],
  "--ha-color-map-transit": [
    "transitRail",
    "transitSubway",
    "transitCycle",
    "transitFoot",
  ],
  "--ha-color-map-boundary": ["boundary", "boundaryDisputed"],
  "--ha-color-map-label": ["label"],
  "--ha-color-map-label-halo": ["labelHalo"],
  "--ha-color-map-label-secondary": [
    "labelSymbol",
    "labelPoi",
    "labelHousenumber",
  ],
};

/**
 * What the active theme says about the map, or undefined when it says nothing -
 * the common case, and the one that keeps the map on the generated style.
 */
export const readMapThemeColors = (
  element: Element
): Record<string, string> | undefined => {
  const style = getComputedStyle(element);
  let colors: Record<string, string> | undefined;

  for (const [token, keys] of Object.entries(MAP_THEME_TOKENS)) {
    const value = style.getPropertyValue(token).trim();
    if (!value) {
      continue;
    }
    colors ??= {};
    for (const key of keys) {
      colors[key] = value;
    }
  }

  return colors;
};
