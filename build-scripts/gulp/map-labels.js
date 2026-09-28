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

export const addLatinLabels = (style) => ({
  ...style,
  layers: style.layers.map((layer) =>
    isNameLabel(layer)
      ? {
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
        }
      : layer
  ),
});
