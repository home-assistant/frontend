#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var merge = require('deepmerge');
var util = require('./util.js');

var inDir = 'translations'
var outDir = 'build/translations';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

var files = fs.readdirSync(inDir);
var translations = [];
files.forEach(function(file) {
  translations.push(path.basename(file, '.json'));
});

// For each language generate a merged json file. It begins with en.json as
// a failsafe for untranslated strings, and merges all parent tags into one
// file for each specific subtag
var translationFingerprints = {};
var en_base = JSON.parse(fs.readFileSync(inDir + '/en.json'));

translations.forEach(function(tr) {
  var subtags = tr.split('-');
  var tr_out = en_base; // Start with en as a fallback if for missing translations
  for (i = 1; i <= subtags.length; i++) {
    var lang = subtags.slice(0, i).join('-');
    var path = inDir + '/' + lang + '.json';
    if (fs.existsSync(path)) {
      json = JSON.parse(fs.readFileSync(path, {"encoding": "UTF-8"}));
      tr_out = merge(tr_out, json);
    }
  }

  // Write the merged translation to the build folder
  var path = outDir + '/' + tr + '.json';
  console.log('Writing', path);
  fs.writeFileSync(path, JSON.stringify(tr_out));
  translationFingerprints[tr] = util.md5(path);

  // en translation is embedded in translation.js as a fallback in case of
  // translation fetch errors
  if (tr == 'en') {
    var path = 'build-temp/fallbackTranslation.js';
    console.log('Writing', path);
    fs.writeFileSync(path, 'export default ' + JSON.stringify(tr_out));
  }
});

var path = 'build-temp/translationFingerprints.js';
console.log('Writing', path);
fs.writeFileSync(path, 'export default ' + JSON.stringify(translationFingerprints));
