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

// Keys the palettes draw translucent. A token is a color, not an opacity, so
// the alpha has to be put back: an opaque `--ha-color-map-green` would turn
// sports pitches into solid blocks, and `--ha-color-map-label-secondary` would
// put house numbers and POI labels at full strength.
const KEY_ALPHA: Record<string, number> = {
  siteSports: 0.15,
  labelHalo: 0.8,
  labelPoi: 0.4,
  labelHousenumber: 0.3,
};

// What @versatiles/style parses. Anything else - a named color, color-mix(),
// color() - makes it throw, which would take the card to raster tiles.
const PARSEABLE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\()/i;

/**
 * Resolves a color the builder cannot parse by letting the browser compute it.
 * Custom properties hold whatever CSS accepts, and a theme has no reason to
 * know which spellings the builder happens to take.
 */
const computeColor = (element: Element, token: string): string | undefined => {
  const probe = document.createElement("span");
  probe.style.cssText = `display:none;color:var(${token})`;
  element.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return PARSEABLE.test(computed) ? computed : undefined;
};

const withAlpha = (color: string, alpha: number): string => {
  // Only a plain hex needs it spelled out; the browser hands back rgb()/rgba()
  // and the builder takes those as they are.
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return (
      color +
      Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")
    );
  }
  const rgb = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .slice(0, 3);
    return `rgba(${parts.join(",")},${alpha})`;
  }
  return color;
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
    const raw = style.getPropertyValue(token).trim();
    if (!raw) {
      continue;
    }
    const value = PARSEABLE.test(raw) ? raw : computeColor(element, token);
    if (!value) {
      continue;
    }
    colors ??= {};
    for (const key of keys) {
      const alpha = KEY_ALPHA[key];
      colors[key] = alpha === undefined ? value : withAlpha(value, alpha);
    }
  }

  return colors;
};
