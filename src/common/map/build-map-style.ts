// Builds a style in the browser, from the same @versatiles/style builder the
// shipping pair is generated with: the palettes that are not generated at build
// time, and any style a card recolors.
//
// Its own chunk, so a map on the default style never asks for it.

import type { OsmOptions } from "@versatiles/style";
import type { StyleSpecification } from "maplibre-gl";
import type { MapPalette } from "./map-styles";
import { finalizeMapStyle } from "./map-style-transforms";

/**
 * The asset URLs the styles are generated with, written by
 * build-scripts/gulp/map-assets.js. Read rather than repeated here because the
 * sprite URL carries a hash of the sheet that ships with this build.
 */
// Versioned: /static is served with a month of max-age, so a cached manifest
// could otherwise pair a new build with the sprite sheet of an old one.
const STYLE_URLS_PATH = `/static/map/urls.json?v=${__VERSION__}`;

let urls: Promise<OsmOptions["urls"]> | undefined;

const styleUrls = () => {
  urls ??= fetch(STYLE_URLS_PATH)
    .then((response) => response.json())
    .catch((err) => {
      // Nothing to fall back on: without the glyph and sprite URLs the style
      // would draw no labels and no icons at all.
      urls = undefined;
      throw err;
    });
  return urls;
};

export const buildMapStyle = async (
  palette: MapPalette,
  options: Record<string, unknown>,
  baseColors?: Record<string, string>
): Promise<StyleSpecification> => {
  const [{ osm }, resolvedUrls] = await Promise.all([
    import("@versatiles/style"),
    styleUrls(),
  ]);

  // Theme and URLs come last: the palette is ours to pick from the theme mode,
  // and the asset URLs are core's proxy and this build's sprite sheet.
  const build = (opts: Record<string, unknown>) =>
    osm({ ...(opts as OsmOptions), theme: palette, urls: resolvedUrls });

  // The builder throws on an option it does not know and on a color it cannot
  // parse. Those come from a card config or a theme, so one typo would
  // otherwise drop the whole card to raster tiles. Step back to the style as it
  // ships - colors included, or the default would come out as the builder's
  // unpainted cartography - and only then to the bare palette.
  const attempts = [
    options,
    ...(baseColors ? [{ colors: baseColors }] : []),
    {},
  ];
  let style: StyleSpecification | undefined;
  for (const attempt of attempts) {
    try {
      style = build(attempt);
      break;
    } catch {
      style = undefined;
    }
  }
  if (!style) {
    throw new Error(`Could not build map style "${palette}"`);
  }

  return finalizeMapStyle(palette, style);
};
