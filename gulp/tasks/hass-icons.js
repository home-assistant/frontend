const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const parse5 = require('parse5');
const getContent = require('../common/http').getContent;

const outputDir = 'hass_frontend';
const iconRegEx = /hass:[\w-]+/g;

const BUILT_IN_PANEL_ICONS = [
  'settings', // Config
  'home-assistant', // Hass.io
  'poll-box', // History panel
  'format-list-bulleted-type', // Logbook
  'mailbox', // Mailbox
  'account-location', // Map
  'cart', // Shopping List
];

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
  const icons = new Set(BUILT_IN_PANEL_ICONS);
  function processFile(filename) {
    const content = fs.readFileSync(filename);
    let match;
    // eslint-disable-next-line
    while (match = iconRegEx.exec(content)) {
      // strip off "hass:" and add to set
      icons.add(match[0].substr(5));
    }
  }
  mapFiles('src', '.html', processFile);
  mapFiles('panels', '.html', processFile);
  mapFiles('hassio', '.html', processFile);
  mapFiles('js', '.js', processFile);
  return icons;
}

function generateHassIcons() {
  const icons = findIcons();

  const iconDoc = parse5.parseFragment(fs.readFileSync(`${outputDir}/mdi.html`, { encoding: 'utf-8' }));

  const ironIconset = iconDoc.childNodes[0];
  ironIconset.attrs.forEach((attr) => {
    if (attr.name === 'name') {
      attr.value = 'hass';
    }
  });

  const defs = ironIconset.childNodes[0].childNodes[0];
  defs.childNodes = defs.childNodes.filter(icon => icons.has(icon.attrs[0].value));

  fs.writeFileSync(`${outputDir}/hass_icons.html`, parse5.serialize(iconDoc));
  // eslint-disable-next-line
  console.log(`Home Assistant has ${icons.size} icons.`);
}

async function downloadMDIIcons() {
  // Fetch website of MaterialDesignIcons.com
  const content = await getContent('https://raw.githubusercontent.com/Templarian/MaterialDesign/master/site/getting-started.savvy');
  // Find link to Polymer v1 download
  const downloadMatch = content.match('(/api/download/polymer/v1/([A-Z0-9-]{36}))');

  if (!downloadMatch) {
    console.error('Unable to find Polymer v1 download link');
    return null;
  }

  // Download iconset
  let iconSet = await getContent(`https://materialdesignicons.com${downloadMatch[0]}`);

  // Strip out the import statement
  iconSet = iconSet.substr(iconSet.indexOf('<iron-iconset-svg'));

  return iconSet;
}

async function main() {
  const iconSet = await downloadMDIIcons();

  if (iconSet === null) throw new Error('Download MDI failed!');

  fs.writeFileSync(`${outputDir}/mdi.html`, iconSet);
  generateHassIcons();
}

// gulp.task('gen-hass-icons', generateHassIcons);
gulp.task('gen-icons', main);
