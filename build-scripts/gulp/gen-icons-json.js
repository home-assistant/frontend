const gulp = require("gulp");
const path = require("path");
const fs = require("fs");

const ICON_PACKAGE_PATH = path.resolve(
  __dirname,
  "../../node_modules/@mdi/svg/"
);
const META_PATH = path.resolve(ICON_PACKAGE_PATH, "meta.json");
const ICON_PATH = path.resolve(ICON_PACKAGE_PATH, "svg");
const OUTPUT_DIR = path.resolve(__dirname, "../../build/mdi");

const encoding = "utf8";

const getMeta = (withPaths) => {
  const file = fs.readFileSync(META_PATH, { encoding });
  const meta = JSON.parse(file);
  if (withPaths) {
    meta.forEach((icon) => {
      const svg = fs.readFileSync(`${ICON_PATH}/${icon.name}.svg`, {
        encoding,
      });
      icon.path = svg.match(/ d="([^"]+)"/)[1];
    });
  }
  return meta;
};

const splitByName = (meta) => {
  const split = {};
  meta.forEach((icon) => {
    if (!split[icon.name[0]]) {
      split[icon.name[0]] = [];
    }
    split[icon.name[0]].push(icon);
  });
  return split;
};

gulp.task("gen-icons-json", (done) => {
  const meta = getMeta(true);
  const split = splitByName(meta);
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  Object.entries(split).forEach(([filename, icons]) => {
    const lines = icons.map((icon) => {
      return `"${icon.name}":"${icon.path}"`;
    });
    const output = `{${lines.join(",")}}`;
    fs.writeFileSync(path.resolve(OUTPUT_DIR, `${filename}.json`), output);
  });
  done();
});
