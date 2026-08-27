// Assembles the static assets of the vector base map - style, SDF glyphs and
// icon sprites - into /static/map/. vector.openstreetmap.org sets CORS headers
// on its tiles only, so these cannot be loaded from there by a browser.
//
// Glyphs and sprites come from pinned VersaTiles releases, cached locally and
// verified against a digest.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { colorful, eclipse } from "@versatiles/style";
import fs from "fs-extra";
import gulp from "gulp";
import { extract } from "tar";
import paths from "../paths.cjs";

// The tile URL is deliberately never named here: the OSMF asks consumers to
// resolve it through the TileJSON so they can move the tiles without every
// client needing a release. https://operations.osmfoundation.org/policies/vector/
const TILEJSON_URL =
  "https://vector.openstreetmap.org/shortbread_v1/tilejson.json";

const ASSET_PATH = "/static/map";

const ARCHIVES = {
  fonts: {
    url: "https://github.com/versatiles-org/versatiles-fonts/releases/download/v2.2.0/noto_sans.tar.gz",
    sha256: "a2dac39f4096722bc420367ffd4a36687cce7229e8aa760bc12cf657072eea6b",
  },
  sprites: {
    url: "https://github.com/versatiles-org/versatiles-style/releases/download/v5.13.1/sprites.tar.gz",
    sha256: "efffd0ee4cb9591bd52f16ff5b269d9618c7dd1db159cd6511943965560ddea5",
  },
};

// Rendered with a device font through `localIdeographFontFamily`, so these are
// never downloaded - and they are 90% of the Noto Sans SDF set.
const LOCAL_IDEOGRAPH_BLOCKS = [
  [0x2e80, 0x9fff], // CJK radicals through CJK Unified Ideographs, incl. kana
  [0xac00, 0xd7ff], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe30, 0xfe4f], // CJK compatibility forms
];

// Our styles use bold only for motorway shields, so Latin, Greek and Cyrillic
// cover every ref and the rest of bold - half the glyph set - is dropped.
// `assertBoldStaysOnRefs` guards the assumption.
const BOLD_MAX_CODEPOINT = 0x04ff;
const BOLD_TEXT_FIELD = "{ref}";

const cacheDir = path.resolve(paths.root_dir, ".map-assets");
const outputDir = path.resolve(paths.build_dir, "map");

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

// Downloads an archive into the cache, or reuses it when the digest matches.
const cachedArchive = async (name, { url, sha256: expected }) => {
  const file = path.join(cacheDir, `${name}.tar.gz`);

  if (await fs.pathExists(file)) {
    if (sha256(await readFile(file)) === expected) {
      return file;
    }
    console.warn("Cached map %s archive is stale, downloading again", name);
  }

  console.log("Downloading map %s from %s", name, url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download map ${name}: ${response.status} ${response.statusText}`
    );
  }
  const body = Buffer.from(await response.arrayBuffer());

  const digest = sha256(body);
  if (digest !== expected) {
    throw new Error(
      `Digest mismatch for map ${name}: expected ${expected}, got ${digest}`
    );
  }

  await fs.outputFile(file, body);
  return file;
};

const glyphRange = (entryPath) => {
  const match = /^(?<font>[^/]+)\/(?<start>\d+)-(?<end>\d+)\.pbf$/.exec(
    entryPath
  );
  return match
    ? { font: match.groups.font, start: Number(match.groups.start) }
    : undefined;
};

const keepGlyph = (entryPath) => {
  const range = glyphRange(entryPath);
  if (!range) {
    return false;
  }
  if (range.font.endsWith("_bold") && range.start > BOLD_MAX_CODEPOINT) {
    return false;
  }
  return !LOCAL_IDEOGRAPH_BLOCKS.some(
    ([from, to]) => range.start >= from && range.start <= to
  );
};

const keepSprite = (entryPath) =>
  /^basics\/sprites(@2x)?\.(json|png)$/.test(entryPath);

// `neutrino`, for one, sets country and state labels in bold - names in any
// script, which would turn to tofu. Fail the build rather than ship that.
const assertBoldStaysOnRefs = (name, style) => {
  const offenders = style.layers
    .filter((layer) =>
      (layer.layout?.["text-font"] ?? []).some((font) => font.endsWith("_bold"))
    )
    .filter((layer) => layer.layout["text-field"] !== BOLD_TEXT_FIELD)
    .map((layer) => layer.id);

  if (offenders.length) {
    throw new Error(
      `Style "${name}" uses bold for ${offenders.join(", ")}, which can hold ` +
        `names in any script. Raise BOLD_MAX_CODEPOINT to cover the full set ` +
        `before shipping this style.`
    );
  }
};

// MapLibre extends the fetched TileJSON with the style's source options, so
// anything left here wins and freezes at build time. Dropping them is what lets
// a remote switch move the attribution and zoom range too, not just the URLs.
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

const styleOptions = {
  // Keeps the generated URLs origin relative.
  baseUrl: "",
  glyphs: `${ASSET_PATH}/fonts/{fontstack}/{range}.pbf`,
  sprite: [{ id: "basics", url: `${ASSET_PATH}/sprites/basics/sprites` }],
};

const buildMapAssets = async () => {
  const [fontArchive, spriteArchive] = await Promise.all([
    cachedArchive("fonts", ARCHIVES.fonts),
    cachedArchive("sprites", ARCHIVES.sprites),
  ]);

  await fs.emptyDir(outputDir);
  await Promise.all([
    fs.ensureDir(path.join(outputDir, "fonts")),
    fs.ensureDir(path.join(outputDir, "sprites")),
  ]);

  await Promise.all([
    extract({
      file: fontArchive,
      cwd: path.join(outputDir, "fonts"),
      filter: keepGlyph,
    }),
    extract({
      file: spriteArchive,
      cwd: path.join(outputDir, "sprites"),
      filter: keepSprite,
    }),
    // Both themes up front: dark is a real cartography, not an inverted raster.
    ...[
      ["light", colorful],
      ["dark", eclipse],
    ].map(([name, builder]) => {
      const style = useTileJson(name, builder(styleOptions));
      assertBoldStaysOnRefs(name, style);
      return writeFile(
        path.join(outputDir, `${name}.json`),
        JSON.stringify(style)
      );
    }),
  ]);
};

// Shared so it does not have to be wired into every pipeline separately.
let pending;
export const ensureMapAssets = () => {
  pending ??= buildMapAssets();
  return pending;
};

gulp.task("build-map-assets", ensureMapAssets);

export const mapAssetsDir = outputDir;
