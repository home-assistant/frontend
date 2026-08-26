// Task to assemble the static assets of the vector base map: the MapLibre
// style, the SDF glyphs it references and its icon sprites.
//
// All three are served from our own /static/map/. vector.openstreetmap.org
// sets CORS headers on the tiles only, and self-hosting keeps the base map
// under our control instead of adding a second host that can disappear.
//
// Glyphs and sprites are published as release archives by the VersaTiles
// project, the same assets vector.openstreetmap.org serves. They are
// downloaded once into a local cache and verified against a pinned digest.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { colorful, eclipse } from "@versatiles/style";
import fs from "fs-extra";
import gulp from "gulp";
import { extract } from "tar";
import paths from "../paths.cjs";

// Tiles come from the OpenStreetMap Foundation, under their vector tile usage
// policy: https://operations.osmfoundation.org/policies/vector/
const TILE_URL =
  "https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt";

// Where the assets end up relative to the served root.
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

// Codepoint blocks MapLibre renders with a local system font through
// `localIdeographFontFamily`, so their glyphs never have to be downloaded.
// They are 90% of the Noto Sans SDF set, which is why we can ship the rest.
const LOCAL_IDEOGRAPH_BLOCKS = [
  [0x2e80, 0x9fff], // CJK radicals through CJK Unified Ideographs, incl. kana
  [0xac00, 0xd7ff], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe30, 0xfe4f], // CJK compatibility forms
];

// The style only uses bold for motorway shields, which carry road refs. Latin,
// Greek and Cyrillic cover every ref we render, so the rest of bold is dropped.
const BOLD_MAX_CODEPOINT = 0x04ff;

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

// Glyph files are named after the 256 codepoint range they cover.
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

// MapLibre only ever asks for the 1x and 2x sprite sheets.
const keepSprite = (entryPath) =>
  /^basics\/sprites(@2x)?\.(json|png)$/.test(entryPath);

const styleOptions = {
  // Keeps the generated URLs origin relative, so they resolve against whatever
  // host the instance is reached on.
  baseUrl: "",
  tiles: [TILE_URL],
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
    // The dark style is a real cartography rather than an inverted raster
    // layer, so both themes are generated up front and swapped at runtime.
    writeFile(
      path.join(outputDir, "light.json"),
      JSON.stringify(colorful(styleOptions))
    ),
    writeFile(
      path.join(outputDir, "dark.json"),
      JSON.stringify(eclipse(styleOptions))
    ),
  ]);
};

// Every build that gathers static files needs these assets, so the work is
// shared instead of being wired into each pipeline separately.
let pending;
export const ensureMapAssets = () => {
  pending ??= buildMapAssets();
  return pending;
};

gulp.task("build-map-assets", ensureMapAssets);

export const mapAssetsDir = outputDir;
