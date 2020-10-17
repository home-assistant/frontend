const gulp = require("gulp");
const path = require("path");
const fs = require("fs");
const hash = require("object-hash");

const ICON_PACKAGE_PATH = path.resolve(
  __dirname,
  "../../node_modules/@mdi/svg/"
);
const META_PATH = path.resolve(ICON_PACKAGE_PATH, "meta.json");
const PACKAGE_PATH = path.resolve(ICON_PACKAGE_PATH, "package.json");
const ICON_PATH = path.resolve(ICON_PACKAGE_PATH, "svg");
const OUTPUT_DIR = path.resolve(__dirname, "../../build/mdi");
const REMOVED_ICONS_PATH = path.resolve(__dirname, "../removedIcons.json");

const encoding = "utf8";

const getMeta = () => {
  const file = fs.readFileSync(META_PATH, { encoding });
  const meta = JSON.parse(file);
  return meta.map((icon) => {
    const svg = fs.readFileSync(`${ICON_PATH}/${icon.name}.svg`, {
      encoding,
    });
    return { path: svg.match(/ d="([^"]+)"/)[1], name: icon.name };
  });
};

const addRemovedMeta = (meta) => {
  const file = fs.readFileSync(REMOVED_ICONS_PATH, { encoding });
  const removed = JSON.parse(file);
  const combinedMeta = [...meta, ...removed];
  return combinedMeta.sort((a, b) => a.name.localeCompare(b.name));
};

const splitBySize = (meta) => {
  const chunks = [];
  const CHUNK_SIZE = 50000;

  let curSize = 0;
  let startKey;
  let icons = [];

  Object.values(meta).forEach((icon) => {
    if (startKey === undefined) {
      startKey = icon.name;
    }
    curSize += icon.path.length;
    icons.push(icon);
    if (curSize > CHUNK_SIZE) {
      chunks.push({
        startKey,
        endKey: icon.name,
        icons,
      });
      curSize = 0;
      startKey = undefined;
      icons = [];
    }
  });

  chunks.push({
    startKey,
    icons,
  });

  return chunks;
};

const findDifferentiator = (curString, prevString) => {
  for (let i = 0; i < curString.length; i++) {
    if (curString[i] !== prevString[i]) {
      return curString.substring(0, i + 1);
    }
  }
  throw new Error("Cannot find differentiator", curString, prevString);
};

gulp.task("gen-icons-json", (done) => {
  const meta = addRemovedMeta(getMeta());
  const split = splitBySize(meta);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const parts = [];

  let lastEnd;
  split.forEach((chunk) => {
    let startKey;
    if (lastEnd === undefined) {
      chunk.startKey = undefined;
      startKey = undefined;
    } else {
      startKey = findDifferentiator(chunk.startKey, lastEnd);
    }
    lastEnd = chunk.endKey;

    const output = {};
    chunk.icons.forEach((icon) => {
      output[icon.name] = icon.path;
    });
    const filename = hash(output);
    parts.push({ start: startKey, file: filename });
    fs.writeFileSync(
      path.resolve(OUTPUT_DIR, `${filename}.json`),
      JSON.stringify(output)
    );
  });

  const file = fs.readFileSync(PACKAGE_PATH, { encoding });
  const package = JSON.parse(file);

  fs.writeFileSync(
    path.resolve(OUTPUT_DIR, "iconMetadata.json"),
    JSON.stringify({ version: package.version, parts })
  );

  done();
});
