/*
Generate a caching service worker for HA

Will be called as part of build_frontend.

Expects home-assistant-polymer repo as submodule of HA repo.
Creates a caching service worker based on the CURRENT content of HA repo.
Output service worker to build/service_worker.js

TODO:
 - Use gulp streams
 - Fix minifying the stream
*/
var gulp = require('gulp');
var crypto = require('crypto');
var file = require('gulp-file');
var fs = require('fs');
var path = require('path');
var swPrecache = require('sw-precache');
var uglifyJS = require('uglify-js');

const config = require('../config');

const DEV = !!JSON.parse(process.env.BUILD_DEV || 'true');

var rootDir = 'hass_frontend';
var panelDir = path.resolve(rootDir, 'panels');

var dynamicUrlToDependencies = {};

var staticFingerprinted = [
  'frontend.html',
  'mdi.html',
  'core.js',
  'compatibility.js',
  'translations/en.json',
];

// These panels will always be registered inside HA and thus can
// be safely assumed to be able to preload.
var panelsFingerprinted = [
  'dev-event', 'dev-info', 'dev-service', 'dev-state', 'dev-template',
  'dev-mqtt', 'kiosk',
];

function md5(filename) {
  return crypto.createHash('md5')
    .update(fs.readFileSync(filename)).digest('hex');
}

gulp.task('gen-service-worker', () => {
  var genPromise = null;
  if (DEV) {
    var devBase = 'console.warn("Service worker caching disabled in development")';
    genPromise = Promise.resolve(devBase);
  } else {
    // Create fingerprinted versions of our dependencies.
    staticFingerprinted.forEach(fn => {
      var parts = path.parse(fn);
      var base = parts.dir.length > 0 ? parts.dir + '/' + parts.name : parts.name;
      var hash = md5(rootDir + '/' + base + parts.ext);
      var url = '/static/' + base + '-' + hash + parts.ext;
      var fpath = rootDir + '/' + base + parts.ext;
      dynamicUrlToDependencies[url] = [fpath];
    });

    panelsFingerprinted.forEach(panel => {
      var fpath = panelDir + '/ha-panel-' + panel + '.html';
      var hash = md5(fpath);
      var url = '/static/panels/ha-panel-' + panel + '-' + hash + '.html';
      dynamicUrlToDependencies[url] = [fpath];
    });
    var fallbackList = '(?!(?:static|api|local|service_worker.js|manifest.json))';

    var options = {
      navigateFallback: '/',
      navigateFallbackWhitelist: [RegExp('^(?:' + fallbackList + '.)*$'],
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
      runtimeCaching: [{
        urlPattern: /\/static\/translations\//,
        handler: 'cacheFirst',
      }, {
        urlPattern: RegExp('^[^/]*/' + fallbackList + '.'),
        handler: 'fastest',
      }],
      stripPrefix: 'hass_frontend',
      replacePrefix: 'static',
      verbose: true,
      // Allow our users to refresh to get latest version.
      clientsClaim: true,
    };

    genPromise = swPrecache.generate(options);
  }

  var swHass = fs.readFileSync(path.resolve(__dirname, '../service-worker.js.tmpl'), 'UTF-8');

  // Fix this
  // if (!DEV) {
  //   genPromise = genPromise.then(
  //     swString => uglifyJS.minify(swString, { fromString: true }).code);
  // }

  return genPromise.then(swString => swString + '\n' + swHass)
    .then(swString => file('service_worker.js', swString)
      .pipe(gulp.dest(config.build_dir)));
});
