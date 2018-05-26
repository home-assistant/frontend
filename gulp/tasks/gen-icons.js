const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const ICON_PACKAGE_PATH = path.resolve(__dirname, '../../node_modules/@mdi/svg/');
const META_PATH = path.resolve(ICON_PACKAGE_PATH, 'meta.json');
const ICON_PATH = path.resolve(ICON_PACKAGE_PATH, 'svg');
const OUTPUT_PATH = path.resolve(__dirname, '../../build/mdi.html');

function iconPath(name) {
  return path.resolve(ICON_PATH, `${name}.svg`);
}

function loadIcon(name) {
  return fs.readFileSync(iconPath(name), 'utf-8');
}

function transformXMLtoPolymer(name, xml) {
  const start = xml.indexOf('><path') + 1;
  const end = xml.length - start - 6;
  const path = xml.substr(start, end);
  return `<g id="${name}">${path}</g>`;
}

function generateIconset(name, iconDefs) {
  return `
<ha-iconset-svg name="${name}" size="24"><svg><defs>
${iconDefs}
</defs></svg></ha-iconset-svg>
  `;
}

async function genIcons(es6) {
  const meta = JSON.parse(fs.readFileSync(path.resolve(ICON_PACKAGE_PATH, META_PATH), 'UTF-8'));
  const iconDefs = meta.map(iconInfo => transformXMLtoPolymer(iconInfo.name, loadIcon(iconInfo.name))).join('');
  fs.writeFileSync(OUTPUT_PATH, generateIconset('mdi', iconDefs));
}

gulp.task('gen-icons', () => genIcons(/* es6= */ true));
