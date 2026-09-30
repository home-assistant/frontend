// Generates the MapLibre styles for the vector base map.
//
// Only the styles. Glyphs and tiles are served by core's proxy, which is what
// lets them be requested with an application User-Agent and without a referrer.
// The sprite sheet ships with the frontend (see map-sprites.js). The styles
// stay here because they come from @versatiles/style and core has no node
// toolchain to regenerate them with.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { osm } from "@versatiles/style";
import fs from "fs-extra";
import gulp from "gulp";
import paths from "../paths.cjs";
import {
  HA_MAP_COLORS,
  HA_MAP_COLORS_DARK,
} from "../../src/common/map/ha-map-palette.ts";
import { addLatinLabels } from "./map-labels.js";
import {
  missingSprites,
  SHEET_FILES,
  SPRITE_SHEET,
  spritesDir,
} from "./map-sprites.js";

const PROXY_PATH = "/api/map_tiles";
const TILEJSON_URL = `${PROXY_PATH}/tilejson.json`;

const outputDir = path.resolve(paths.build_dir, "map");

// MapLibre extends the fetched TileJSON with the style's source options, so
// anything left here wins and freezes at build time. Dropping them is what lets
// the proxy move the attribution and zoom range too, not just the URLs.
const TILEJSON_FIELDS = [
  "tiles",
  "attribution",
  "bounds",
  "minzoom",
  "maxzoom",
  "scheme",
];

// The builder can only write a tile URL, so the source is repointed afterwards.
// Keyed on there being exactly one source: any other shape means the builder's
// own default host would ship unnoticed.
const useTileJson = (name, style) => {
  const sources = Object.values(style.sources);

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

// Core serves /static with a month of max-age, so a re-vendored sheet would
// otherwise keep being read from cache next to a style that expects the new one.
const sheetHash = async () => {
  const contents = await Promise.all(
    SHEET_FILES.map((file) => readFile(path.join(spritesDir, file)))
  );
  const hash = createHash("sha256");
  contents.forEach((content) => hash.update(content));
  return hash.digest("hex").slice(0, 8);
};

const styleOptions = (spriteVersion) => ({
  urls: {
    // Keeps the generated URLs origin relative.
    base: "",
    glyphsPattern: `${PROXY_PATH}/fonts/{fontstack}/{range}.pbf`,
    sprite: [
      {
        id: SPRITE_SHEET,
        url: `/static/map/sprites/${SPRITE_SHEET}?v=${spriteVersion}`,
      },
    ],
  },
});

const checkSprites = (name, style, sheet) => {
  const missing = missingSprites(style, sheet);
  if (missing.length) {
    throw new Error(
      `Style "${name}" references icons missing from the bundled ${SPRITE_SHEET} ` +
        `sprite sheet: ${missing.join(", ")}. Run \`pnpm exec gulp update-map-sprites\` ` +
        `and commit the result.`
    );
  }
  return style;
};

// Both themes up front: dark is a real cartography, not an inverted raster.
// The colors are the frontend's own, so the palette is shared with it rather
// than restated here; Node loads that TypeScript module as it is.
const THEMES = [
  ["light", "colorful", HA_MAP_COLORS],
  ["dark", "colorful-dark", HA_MAP_COLORS_DARK],
];

const generateStyles = async () => {
  const sheet = await fs.readJson(
    path.join(spritesDir, `${SPRITE_SHEET}.json`)
  );
  const options = styleOptions(await sheetHash());
  return THEMES.map(([name, theme, colors]) => [
    name,
    addLatinLabels(
      checkSprites(
        name,
        useTileJson(name, osm({ theme, colors, ...options })),
        sheet
      )
    ),
  ]);
};

const buildMapAssets = async () => {
  await fs.emptyDir(outputDir);
  const styles = await generateStyles();
  await Promise.all(
    styles.map(([name, style]) =>
      writeFile(path.join(outputDir, `${name}.json`), JSON.stringify(style))
    )
  );
};

// Shared so it does not have to be wired into every pipeline separately.
let pending;
export const ensureMapAssets = () => {
  pending ??= buildMapAssets();
  return pending;
};

gulp.task("build-map-assets", ensureMapAssets);

// Runs in the required lint job so a @versatiles/style bump that needs new
// icons cannot merge before the sheet is re-vendored on that branch.
gulp.task("check-map-sprites", generateStyles);

export const mapAssetsDir = outputDir;
