const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const parse5 = require('parse5');

const iconRegEx = /mdi:[\w-]+/g;

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


function findIcons() {
  const icons = new Set();
  function processFile(filename) {
    const content = fs.readFileSync(filename);
    let match;
    while (match = iconRegEx.exec(content)) {
      icons.add(match[0].substr(4));
    };
  }
  mapFiles('src', '.html', processFile);
  mapFiles('panels', '.html', processFile);
  mapFiles('hassio', '.html', processFile);
  mapFiles('js', '.js', processFile);
  return icons;
}

async function generateHassIcons() {
  const icons = findIcons();

  const iconDoc = parse5.parseFragment(
    fs.readFileSync('hass_frontend/mdi.html', { encoding: 'utf-8' }));

  const ironIconset = iconDoc.childNodes[0];
  ironIconset.attrs.forEach(attr => {
    if (attr.name == 'name') {
      attr.value = 'hass';
    }
  });

  const defs = ironIconset.childNodes[0].childNodes[0];
  defs.childNodes = defs.childNodes.filter(icon => icons.has(icon.attrs[0].value));

  fs.writeFileSync('hass_frontend/hass_icons.html', parse5.serialize(iconDoc));
  console.log(`Home Assistant has ${icons.size} icons.`);
}

gulp.task('gen-hass-icons', generateHassIcons);
