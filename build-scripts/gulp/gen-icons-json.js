import fs from "fs";
import gulp from "gulp";
import hash from "object-hash";
import path from "path";
import paths from "../paths.cjs";

const ICON_PACKAGE_PATH = path.resolve("node_modules/@mdi/svg/");
const META_PATH = path.resolve(ICON_PACKAGE_PATH, "meta.json");
const PACKAGE_PATH = path.resolve(ICON_PACKAGE_PATH, "package.json");
const ICON_PATH = path.resolve(ICON_PACKAGE_PATH, "svg");
const OUTPUT_DIR = path.resolve(paths.build_dir, "mdi");
const REMOVED_ICONS_PATH = new URL("../removedIcons.json", import.meta.url);

const encoding = "utf8";

const getMeta = () => {
  const file = fs.readFileSync(META_PATH, { encoding });
  const meta = JSON.parse(file);
  return meta.map((icon) => {
    const svg = fs.readFileSync(`${ICON_PATH}/${icon.name}.svg`, {
      encoding,
    });
    return {
      path: svg.match(/ d="([^"]+)"/)[1],
      name: icon.name,
      tags: icon.tags,
      aliases: icon.aliases,
    };
  });
};

const addRemovedMeta = (meta) => {
  const file = fs.readFileSync(REMOVED_ICONS_PATH, { encoding });
  const removed = JSON.parse(file);
  const removedMeta = removed.map((removeIcon) => ({
    path: removeIcon.path,
    name: removeIcon.name,
    tags: [],
    aliases: [],
  }));
  const combinedMeta = [...meta, ...removedMeta];
  return combinedMeta.sort((a, b) => a.name.localeCompare(b.name));
};

const homeAutomationTag = "Home Automation";

const orderMeta = (meta) => {
  const homeAutomationMeta = meta.filter((icon) =>
    icon.tags.includes(homeAutomationTag)
  );
  const otherMeta = meta.filter(
    (icon) => !icon.tags.includes(homeAutomationTag)
  );
  return [...homeAutomationMeta, ...otherMeta];
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
  const meta = getMeta();

  const metaAndRemoved = addRemovedMeta(meta);
  const split = splitBySize(metaAndRemoved);

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
  const packageMeta = JSON.parse(file);

  fs.writeFileSync(
    path.resolve(OUTPUT_DIR, "iconMetadata.json"),
    JSON.stringify({ version: packageMeta.version, parts })
  );

  fs.writeFileSync(
    path.resolve(OUTPUT_DIR, "iconList.json"),
    JSON.stringify(
      orderMeta(meta).map((icon) => ({
        name: icon.name,
        keywords: [
          ...icon.tags.map((t) => t.toLowerCase().replace(/\s\/\s/g, " ")),
          ...icon.aliases,
        ],
      }))
    )
  );

  done();
});

gulp.task("gen-dummy-icons-json", (done) => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(path.resolve(OUTPUT_DIR, "iconList.json"), "[]");
  done();
});
