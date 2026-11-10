import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import gulp from "gulp";
import paths from "../paths.cjs";

const require = createRequire(import.meta.url);

export const SPRITE_SHEET = "base";
export const spritesDir = path.resolve(
  paths.root_dir,
  "public",
  "static",
  "map",
  "sprites"
);

export const SHEET_FILES = [".json", ".png", "@2x.json", "@2x.png"].map(
  (suffix) => `${SPRITE_SHEET}${suffix}`
);

// The only style properties that resolve to a sprite image.
const IMAGE_PROPERTIES = [
  "icon-image",
  "fill-pattern",
  "line-pattern",
  "fill-extrusion-pattern",
  "background-pattern",
];

const collectStrings = (value, into) => {
  if (typeof value === "string") {
    into.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, into));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, into));
  }
  return into;
};

export const spriteIds = (style) => {
  const prefix = `${SPRITE_SHEET}:`;
  const strings = style.layers.flatMap((layer) =>
    IMAGE_PROPERTIES.flatMap((property) =>
      collectStrings([layer.layout?.[property], layer.paint?.[property]], [])
    )
  );
  return new Set(
    strings
      .filter((value) => value.startsWith(prefix))
      .map((value) => value.slice(prefix.length))
  );
};

export const missingSprites = (style, sheet) =>
  [...spriteIds(style)].filter((id) => !(id in sheet));

gulp.task("update-map-sprites", async () => {
  const { version } = require("@versatiles/style/package.json");
  const url = `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz`;
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const tar = spawn("tar", ["-xzf", "-", "-C", spritesDir, ...SHEET_FILES], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  const exited = new Promise((resolve, reject) => {
    tar.on("error", reject);
    tar.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`))
    );
  });
  await pipeline(Readable.fromWeb(response.body), tar.stdin);
  await exited;
});
