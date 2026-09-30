// The vector cartographies the map can draw. Each is a light and a dark
// palette; the theme mode picks the half.
//
// Only the default pair is generated at build time (build-scripts/gulp/
// map-assets.js); everything else is built in the browser from the same
// builder, against the tiles and glyphs core's proxy already serves.

import { HA_MAP_COLORS, HA_MAP_COLORS_DARK } from "./ha-map-palette";

/** Style ids, in the order the card editor offers them */
export const MAP_STYLES = [
  "default",
  "colorful",
  "natural",
  "muted",
  "gray",
  "toner",
] as const;

export type MapStyle = (typeof MAP_STYLES)[number];

export const DEFAULT_MAP_STYLE: MapStyle = "default";

/** @versatiles/style's cartographies, each a light and a dark palette */
type VersatilesPalette = "colorful" | "natural" | "muted" | "gray" | "toner";

export type MapPalette = VersatilesPalette | `${VersatilesPalette}-dark`;

/** A cartography plus the colors painted over it; only the default has any */
const STYLE_PALETTES: Record<
  MapStyle,
  {
    palette: VersatilesPalette;
    colors?: Record<string, string>;
    colorsDark?: Record<string, string>;
  }
> = {
  default: {
    palette: "colorful",
    colors: HA_MAP_COLORS,
    colorsDark: HA_MAP_COLORS_DARK,
  },
  colorful: { palette: "colorful" },
  natural: { palette: "natural" },
  muted: { palette: "muted" },
  gray: { palette: "gray" },
  toner: { palette: "toner" },
};

/**
 * Color adjustments applied to the whole style, straight from
 * @versatiles/style's `recolor`. The tiles.versatiles.org styler writes these.
 */
export interface MapStyleRecolor {
  /** Swap light for dark, keeping the hues */
  invert_brightness?: boolean;
  /** Hue rotation in degrees */
  rotate_hue?: number;
  /** -1 is grayscale, 0 unchanged, 1 twice as saturated */
  saturate?: number;
  gamma?: number;
  contrast?: number;
  brightness?: number;
  tint?: { color?: string; amount?: number };
  blend?: { color?: string; amount?: number };
}

/** A style with adjustments, rather than one of the styles as it comes */
export interface CustomMapStyleConfig {
  /** Cartography the adjustments start from; omit for the default */
  base?: MapStyle;
  /** Per-feature colors, keyed as @versatiles/style names them (water, land, natureWood, ...) */
  colors?: Record<string, string>;
  /**
   * Colors for the dark palette. Replaces `colors` rather than merging with
   * it: a light palette showing through the keys a dark one did not name is
   * the mistake this exists to prevent. Without it `colors` is used for both.
   */
  colors_dark?: Record<string, string>;
  recolor?: MapStyleRecolor;
  /** Label options: language, and sizes per kind of label */
  text?: Record<string, unknown>;
  /** Icon scale and spacing */
  icon?: Record<string, unknown>;
  /** Which feature groups are drawn, and from which zoom */
  layers?: boolean | number | Record<string, unknown>;
}

export type MapStyleConfig = MapStyle | CustomMapStyleConfig;

/** A style ready to be loaded: the palette to draw, plus adjustments if any */
export interface ResolvedMapStyle {
  palette: MapPalette;
  /** Options for @versatiles/style; absent means the palette as it comes */
  options?: Record<string, unknown>;
  /** Fetched rather than built: the default, while nothing was added to it */
  shipped?: "light" | "dark";
  /**
   * The style's own colors, without what the theme or the card painted over
   * them. What to fall back on when the builder rejects an adjustment, so a
   * bad value costs the adjustments rather than the cartography.
   */
  baseColors?: Record<string, string>;
}

const isStyle = (value: unknown): value is MapStyle =>
  (MAP_STYLES as readonly unknown[]).includes(value);

export const isCustomMapStyle = (
  style: MapStyleConfig | undefined
): style is CustomMapStyleConfig => typeof style === "object" && style !== null;

export const paletteFor = (style: MapStyle, darkMode: boolean): MapPalette => {
  const { palette } = STYLE_PALETTES[style];
  return darkMode ? `${palette}-dark` : palette;
};

// An allowlist, not a passthrough: the builder also takes the tile, glyph and
// sprite URLs, and those stay ours.
const BUILDER_OPTIONS = ["colors", "recolor", "text", "icon", "layers"];

const camelCase = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

// Both spellings are accepted so an options object copied from the versatiles
// styler pastes as it is. Deep, because the builder nests its options.
const camelCaseKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(camelCaseKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        camelCase(key),
        camelCaseKeys(entry),
      ])
    );
  }
  return value;
};

const builderOptions = (style: CustomMapStyleConfig, darkMode: boolean) => {
  const config = style as Record<string, unknown>;
  const options: Record<string, unknown> = {};
  for (const name of BUILDER_OPTIONS) {
    const value = config[name] ?? config[camelCase(name)];
    if (value !== undefined) {
      options[camelCase(name)] = camelCaseKeys(value);
    }
  }

  // `colors_dark` is not an option of the builder's, so the allowlist above
  // has already dropped it; on the dark palette it stands in for `colors`.
  // Ours rather than the builder's, so it is spelled the way configs are and
  // has no camelCase twin - unlike the options pasted from the styler.
  const colorsDark = config.colors_dark;
  if (darkMode && colorsDark !== undefined) {
    options.colors = camelCaseKeys(colorsDark);
  }

  return options;
};

/**
 * A picked cartography back into a config value, keeping whatever only YAML can
 * write. A bare name while there is nothing else, an object once there is.
 *
 * The visual editor offers the cartography and nothing else, so without this an
 * edit would drop a hand-written palette without saying so.
 */
export const withMapStyleBase = (
  current: MapStyleConfig | undefined,
  base: string | undefined
): MapStyleConfig | undefined => {
  // The form always holds a value, so writing the default back would add
  // `map_style: default` to every card the editor touches.
  const style = isStyle(base) && base !== DEFAULT_MAP_STYLE ? base : undefined;

  const carried: Record<string, unknown> = isCustomMapStyle(current)
    ? { ...current }
    : {};
  delete carried.base;

  if (!Object.keys(carried).length) {
    return style;
  }
  return {
    ...(style && { base: style }),
    ...carried,
  } as CustomMapStyleConfig;
};

/** A style that does not exist would leave the map blank, so it falls back */
export const resolveMapStyle = (
  style: MapStyleConfig | undefined,
  darkMode: boolean,
  /** What the active theme paints over the style; see map-theme-colors.ts */
  themeColors?: Record<string, string>
): ResolvedMapStyle => {
  const custom = isCustomMapStyle(style) ? style : undefined;
  const named = custom ? custom.base : style;
  const mapStyle = isStyle(named) ? named : DEFAULT_MAP_STYLE;

  const palette = paletteFor(mapStyle, darkMode);
  const options = custom ? builderOptions(custom, darkMode) : {};
  // Before the colors below are merged in, so it answers whether the card
  // asked for anything of its own.
  const cardAdjusted = Object.keys(options).length > 0;

  // Bottom up: the style's colors, what the theme repaints, then what the card
  // names - so a card that sets one color keeps the rest of the look.
  const { colors, colorsDark } = STYLE_PALETTES[mapStyle];
  const styleColors = (darkMode ? colorsDark : colors) ?? colors;
  if (styleColors || themeColors) {
    options.colors = {
      ...styleColors,
      ...themeColors,
      ...(options.colors as Record<string, string> | undefined),
    };
  }

  if (!Object.keys(options).length) {
    return { palette };
  }

  const base = styleColors ? { baseColors: styleColors } : {};

  // Anything added on top of the shipped default has to be built here.
  const untouched = !themeColors && !cardAdjusted;
  return mapStyle === DEFAULT_MAP_STYLE && untouched
    ? { palette, options, ...base, shipped: darkMode ? "dark" : "light" }
    : { palette, options, ...base };
};
