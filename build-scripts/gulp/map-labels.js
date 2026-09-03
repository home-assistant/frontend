// Adds the English name to labels whose local name is not in Latin script.
// Shortbread tiles carry `name`, `name_en` and `name_de` only.

const NAME = ["get", "name"];
const NAME_EN = ["get", "name_en"];

// Strings compare by code point: anything from Basic Latin up to Latin
// Extended-B, digits and punctuation included.
const IS_LATIN = ["<", NAME, "ɐ"];

const ENGLISH_SCALE = 0.8;

// Streets are line-placed and cannot break lines.
const withEnglish = (placement) =>
  placement === "line"
    ? ["concat", NAME, " (", NAME_EN, ")"]
    : ["format", NAME, {}, "\n", {}, NAME_EN, { "font-scale": ENGLISH_SCALE }];

const isNameLabel = (layer) =>
  JSON.stringify(layer.layout?.["text-field"]) === JSON.stringify(NAME);

// The OSMF Shortbread tiles carry some places twice: once as the place node
// and once as the centroid of its boundary area, tens of pixels apart. The
// style renders every feature of a kind, so those show as doubled labels.
// VersaTiles' own tiles dedupe at generation and are unaffected.
//
// A style expression only ever sees one feature, so the copies cannot be
// compared to each other; the population tag is the proxy. It lives on the
// place node, and towns and larger are tagged with one nearly without
// exception, so requiring it keeps the node and drops the centroid copy.
// Smaller places often lack the tag, so filtering them would erase real
// labels; they get a collision padding instead, which only ever hides a label
// that overlaps another one.
const POPULATED_PLACE_KINDS = ["town", "city", "state_capital", "capital"];
const SMALL_PLACE_PADDING = 24;

const isPlaceLabel = (layer) => layer["source-layer"] === "place_labels";

// The style filters places as ["==", ["get", "kind"], "<kind>"]
const placeKind = (layer) =>
  Array.isArray(layer.filter) && layer.filter[0] === "=="
    ? layer.filter[2]
    : undefined;

const dedupePlaceLabel = (layer) => {
  if (!isPlaceLabel(layer)) {
    return layer;
  }
  if (POPULATED_PLACE_KINDS.includes(placeKind(layer))) {
    return {
      ...layer,
      filter: ["all", layer.filter, ["has", "population"]],
    };
  }
  return {
    ...layer,
    layout: { ...layer.layout, "text-padding": SMALL_PLACE_PADDING },
  };
};

export const addLatinLabels = (style) => ({
  ...style,
  layers: style.layers.map((layer) => {
    if (!isNameLabel(layer)) {
      return layer;
    }
    return dedupePlaceLabel({
      ...layer,
      layout: {
        ...layer.layout,
        "text-field": [
          "case",
          IS_LATIN,
          NAME,
          ["!", ["has", "name_en"]],
          NAME,
          withEnglish(layer.layout["symbol-placement"]),
        ],
      },
    });
  }),
});
