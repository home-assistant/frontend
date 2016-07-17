/*
Generate a caching service worker for HA

Will be called as part of build_frontend.

Expects home-assistant-polymer repo as submodule of HA repo.
Creates a caching service worker based on the CURRENT content of HA repo.
Output service worker to build/service_worker.js
*/
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var swPrecache = require('sw-precache');
var uglifyJS = require('uglify-js');

var rootDir = '..';
var panelDir = rootDir + '/panels';
// var panels = fs.readdirSync(panelDir);

var dynamicUrlToDependencies = {
  '/': [rootDir + '/frontend.html', rootDir + '/core.js'],
};

var staticFingerprinted = [
  'frontend.html',
  'mdi.html',
  'core.js',
];

// The panels that will always be loaded
var panelsFingerprinted = [
  'map', 'dev-event', 'dev-info', 'dev-service', 'dev-state', 'dev-template',
];

function md5(filename) {
  return crypto.createHash('md5')
    .update(fs.readFileSync(filename)).digest('hex');
}

// Create fingerprinted versions of our dependencies.
staticFingerprinted.forEach(fn => {
  var parts = path.parse(fn);
  var hash = md5(rootDir + '/' + parts.name + parts.ext);
  var url = '/static/' + parts.name + '-' + hash + parts.ext;
  var fpath = rootDir + '/' + parts.name + parts.ext;
  dynamicUrlToDependencies[url] = [fpath];
});

panelsFingerprinted.forEach(panel => {
  var fpath = panelDir + '/ha-panel-' + panel + '.html';
  var hash = md5(fpath);
  var url = '/frontend/panels/' + panel + '-' + hash + '.html';
  dynamicUrlToDependencies[url] = [fpath];
});

var options = {
  navigateFallback: '/',
  navigateFallbackWhitelist: [/^((?!(static|api)).)*$/],
  dynamicUrlToDependencies: dynamicUrlToDependencies,
  staticFileGlobs: [
    rootDir + '/icons/favicon.ico',
    rootDir + '/icons/favicon-192x192.png',
    rootDir + '/webcomponents-lite.min.js',
    rootDir + '/fonts/roboto/Roboto-Light.ttf',
    rootDir + '/fonts/roboto/Roboto-Medium.ttf',
    rootDir + '/fonts/roboto/Roboto-Regular.ttf',
    rootDir + '/fonts/roboto/Roboto-Bold.ttf',
    rootDir + '/images/card_media_player_bg.png',
  ],
  stripPrefix: '..',
  replacePrefix: 'static',
  verbose: true,
};

var genPromise = swPrecache.generate(options);

if (true) {
  genPromise = genPromise.then(
    swString => uglifyJS.minify(swString, { fromString: true }).code);
}

genPromise.then(
  swString =>
    fs.writeFileSync(path.join('build', 'service_worker.js'), swString)
).catch(err => console.error(err));
