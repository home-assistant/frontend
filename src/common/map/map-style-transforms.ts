// What every vector style goes through before MapLibre sees it, whether it was
// built here or in the browser.
//
// build-scripts/gulp/map-assets.js imports this too and Node loads it as it is:
// keep the module free of runtime imports, and of TypeScript that is not simply
// erased (no enums, no parameter properties).

import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

/** Where core proxies the tiles and glyphs */
export const MAP_TILES_PATH = "/api/map_tiles";

const TILEJSON_URL = `${MAP_TILES_PATH}/tilejson.json`;

// MapLibre extends the fetched TileJSON with the style's own source options, so
// anything left here would freeze at build time - including attribution and
// zoom range, not just the URLs.
const TILEJSON_FIELDS = [
  "tiles",
  "attribution",
  "bounds",
  "minzoom",
  "maxzoom",
  "scheme",
];

/**
 * Repoints the style's one source at the proxy's TileJSON. Keyed on there being
 * exactly one: any other shape means the builder's own default host would reach
 * a browser unnoticed.
 */
const useTileJson = (name: string, style: StyleSpecification) => {
  const sources = Object.values(style.sources) as Record<string, unknown>[];

  if (sources.length !== 1) {
    throw new Error(
      `Style "${name}" has ${sources.length} sources, expected exactly one to ` +
        `point at the TileJSON. Check what @versatiles/style emits.`
    );
  }

  for (const field of TILEJSON_FIELDS) {
    delete sources[0][field];
  }
  sources[0].url = TILEJSON_URL;
  return style;
};

// Adds the English name to labels whose local name is not in Latin script.
// Shortbread tiles carry `name`, `name_en` and `name_de` only.

const NAME: ExpressionSpecification = ["get", "name"];
const NAME_EN: ExpressionSpecification = ["get", "name_en"];

// Strings compare by code point: anything from Basic Latin up to Latin
// Extended-B, digits and punctuation included.
const IS_LATIN: ExpressionSpecification = ["<", NAME, "ɐ"];

const ENGLISH_SCALE = 0.8;

// Streets are line-placed and cannot break lines.
const withEnglish = (placement: unknown): ExpressionSpecification =>
  placement === "line"
    ? ["concat", NAME, " (", NAME_EN, ")"]
    : ["format", NAME, {}, "\n", {}, NAME_EN, { "font-scale": ENGLISH_SCALE }];

const layoutOf = (layer: LayerSpecification) =>
  (layer as SymbolLayerSpecification).layout as
    Record<string, unknown> | undefined;

const isNameLabel = (layer: LayerSpecification) =>
  JSON.stringify(layoutOf(layer)?.["text-field"]) === JSON.stringify(NAME);

const addLatinLabels = (style: StyleSpecification): StyleSpecification => ({
  ...style,
  layers: style.layers.map((layer) => {
    const layout = layoutOf(layer);
    if (!layout || !isNameLabel(layer)) {
      return layer;
    }
    const textField: ExpressionSpecification = [
      "case",
      IS_LATIN,
      NAME,
      ["!", ["has", "name_en"]],
      NAME,
      withEnglish(layout["symbol-placement"]),
    ];
    return {
      ...layer,
      layout: { ...layout, "text-field": textField },
    } as LayerSpecification;
  }),
});

// The atmosphere MapLibre scatters around the globe, which VersaTiles leaves
// off for a crisp edge. Against the space ha-map draws behind it, that edge is
// what wants softening.
const ATMOSPHERE_BLEND = 0.5;

const addAtmosphere = (style: StyleSpecification): StyleSpecification => ({
  ...style,
  sky: { ...style.sky, "atmosphere-blend": ATMOSPHERE_BLEND },
});

/** Everything a freshly built style needs before it is handed to MapLibre */
export const finalizeMapStyle = (
  name: string,
  style: StyleSpecification
): StyleSpecification =>
  addAtmosphere(addLatinLabels(useTileJson(name, style)));
