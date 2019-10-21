const gulp = require("gulp");
const path = require("path");
const fs = require("fs");
const paths = require("../paths");

const ICON_PACKAGE_PATH = path.resolve(
  __dirname,
  "../../node_modules/@mdi/svg/"
);
const META_PATH = path.resolve(ICON_PACKAGE_PATH, "meta.json");
const ICON_PATH = path.resolve(ICON_PACKAGE_PATH, "svg");
const OUTPUT_DIR = path.resolve(__dirname, "../../build");
const MDI_OUTPUT_PATH = path.resolve(OUTPUT_DIR, "mdi.html");
const HASS_OUTPUT_PATH = path.resolve(OUTPUT_DIR, "hass-icons.html");

const BUILT_IN_PANEL_ICONS = [
  "calendar", // Calendar
  "settings", // Config
  "home-assistant", // Hass.io
  "poll-box", // History panel
  "format-list-bulleted-type", // Logbook
  "mailbox", // Mailbox
  "tooltip-account", // Map
  "cart", // Shopping List
  "hammer", // developer-tools
];

// Given an icon name, load the SVG file
function loadIcon(name) {
  const iconPath = path.resolve(ICON_PATH, `${name}.svg`);
  try {
    return fs.readFileSync(iconPath, "utf-8");
  } catch (err) {
    return null;
  }
}

// Given an SVG file, convert it to an iron-iconset-svg definition
function transformXMLtoPolymer(name, xml) {
  const start = xml.indexOf("><path") + 1;
  const end = xml.length - start - 6;
  const pth = xml.substr(start, end);
  return `<g id="${name}">${pth}</g>`;
}

// Given an iconset name and icon names, generate a polymer iconset
function generateIconset(iconsetName, iconNames) {
  const iconDefs = Array.from(iconNames)
    .map((name) => {
      const iconDef = loadIcon(name);
      if (!iconDef) {
        throw new Error(`Unknown icon referenced: ${name}`);
      }
      return transformXMLtoPolymer(name, iconDef);
    })
    .join("");
  return `<ha-iconset-svg name="${iconsetName}" size="24"><svg><defs>${iconDefs}</defs></svg></ha-iconset-svg>`;
}

// Helper function to map recursively over files in a folder and it's subfolders
function mapFiles(startPath, filter, mapFunc) {
  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      mapFiles(filename, filter, mapFunc);
    } else if (filename.indexOf(filter) >= 0) {
      mapFunc(filename);
    }
  }
}

// Find all icons used by the project.
function findIcons(searchPath, iconsetName) {
  const iconRegex = new RegExp(`${iconsetName}:[\\w-]+`, "g");
  const icons = new Set();
  function processFile(filename) {
    const content = fs.readFileSync(filename);
    let match;
    // eslint-disable-next-line
    while ((match = iconRegex.exec(content))) {
      // strip off "hass:" and add to set
      icons.add(match[0].substr(iconsetName.length + 1));
    }
  }
  mapFiles(searchPath, ".js", processFile);
  mapFiles(searchPath, ".ts", processFile);
  return icons;
}

gulp.task("gen-icons-mdi", (done) => {
  const meta = JSON.parse(
    fs.readFileSync(path.resolve(ICON_PACKAGE_PATH, META_PATH), "UTF-8")
  );
  const iconNames = meta.map((iconInfo) => iconInfo.name);
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  fs.writeFileSync(MDI_OUTPUT_PATH, generateIconset("mdi", iconNames));
  done();
});

gulp.task("gen-icons-app", (done) => {
  const iconNames = findIcons("./src", "hass");
  BUILT_IN_PANEL_ICONS.forEach((name) => iconNames.add(name));
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  fs.writeFileSync(HASS_OUTPUT_PATH, generateIconset("hass", iconNames));
  done();
});

gulp.task("gen-icons-demo", (done) => {
  const iconNames = findIcons(path.resolve(paths.demo_dir, "./src"), "hademo");
  fs.writeFileSync(
    path.resolve(paths.demo_dir, "hademo-icons.html"),
    generateIconset("hademo", iconNames)
  );
  done();
});

gulp.task("gen-icons-hassio", (done) => {
  const iconNames = findIcons(
    path.resolve(paths.hassio_dir, "./src"),
    "hassio"
  );
  // Find hassio icons inside HA main repo.
  for (const item of findIcons(
    path.resolve(paths.polymer_dir, "./src"),
    "hassio"
  )) {
    iconNames.add(item);
  }
  fs.writeFileSync(
    path.resolve(paths.hassio_dir, "hassio-icons.html"),
    generateIconset("hassio", iconNames)
  );
  done();
});
