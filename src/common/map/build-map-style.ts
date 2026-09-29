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
const STYLE_URLS_PATH = "/static/map/urls.json";

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
  options: Record<string, unknown>
): Promise<StyleSpecification> => {
  const [{ osm }, resolvedUrls] = await Promise.all([
    import("@versatiles/style"),
    styleUrls(),
  ]);

  // Theme and URLs come last: the palette is ours to pick from the theme mode,
  // and the asset URLs are core's proxy and this build's sprite sheet.
  const style = osm({
    ...(options as OsmOptions),
    theme: palette,
    urls: resolvedUrls,
  });

  return finalizeMapStyle(palette, style);
};
