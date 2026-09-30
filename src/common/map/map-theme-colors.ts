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

type Rgba = [number, number, number, number];

const HEX = /^#([0-9a-f]{3,8})$/i;
const RGB = /^rgba?\(([^)]+)\)$/i;
// What a browser hands back for a color() or color-mix() in sRGB.
const SRGB =
  /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i;

const parseColor = (value: string): Rgba | undefined => {
  const hex = value.match(HEX);
  if (hex) {
    const d = hex[1];
    const short = d.length === 3 || d.length === 4;
    const part = (i: number) =>
      short
        ? parseInt(d[i] + d[i], 16)
        : parseInt(d.slice(i * 2, i * 2 + 2), 16);
    if (d.length === 3 || d.length === 4 || d.length === 6 || d.length === 8) {
      const alpha = d.length === 4 || d.length === 8 ? part(3) / 255 : 1;
      return [part(0), part(1), part(2), alpha];
    }
    return undefined;
  }
  const rgb = value.match(RGB);
  if (rgb) {
    const parts = rgb[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) {
      return undefined;
    }
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  }
  const srgb = value.match(SRGB);
  if (srgb) {
    const to255 = (n: string) => Math.round(Number(n) * 255);
    return [
      to255(srgb[1]),
      to255(srgb[2]),
      to255(srgb[3]),
      Number(srgb[4] ?? 1),
    ];
  }
  return undefined;
};

// Everything the browser can compute but this module cannot read on its own:
// named colors, hsl(), color-mix(), and a token built out of other properties.
// The sentinel catches a value that is not a color at all, which would
// otherwise quietly inherit the surrounding text color.
const SENTINEL: Rgba = [1, 2, 3, 1];

const computeColor = (element: Element, token: string): Rgba | undefined => {
  const probe = document.createElement("span");
  probe.style.cssText = "display:none;color:rgb(1, 2, 3)";
  const inner = document.createElement("span");
  inner.style.color = `var(${token})`;
  probe.append(inner);
  element.append(probe);
  const parsed = parseColor(getComputedStyle(inner).color);
  probe.remove();
  return parsed && parsed.every((n, i) => n === SENTINEL[i])
    ? undefined
    : parsed;
};

/**
 * What the active theme says about the map, or undefined when it says nothing -
 * the common case, and the one that keeps the map on the generated style.
 *
 * Every value comes out as `rgba()`, which is both what @versatiles/style takes
 * and what lets a feature's own opacity be put back: the builder throws on a
 * color it cannot parse, and that would cost the card its vector map.
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
    const rgba = parseColor(raw) ?? computeColor(element, token);
    if (!rgba) {
      continue;
    }
    colors ??= {};
    const [r, g, b, a] = rgba;
    for (const key of keys) {
      // Rounded, or an eight digit hex turns into a sixteen digit fraction.
      const alpha = Math.round(a * (KEY_ALPHA[key] ?? 1) * 1000) / 1000;
      colors[key] = `rgba(${r},${g},${b},${alpha})`;
    }
  }

  return colors;
};
