/*
Generate a caching service worker for HA

Will be called as part of build_frontend.

Creates a caching service worker based on the built content of the repo in
{hass_frontend, hass_frontend_es6}.
Output service worker to {build, build-es6}/service_worker.js

TODO:
 - Use gulp streams
 - Fix minifying the stream
*/
const gulp = require('gulp');
const file = require('gulp-file');
const fs = require('fs');
const path = require('path');
const swPrecache = require('sw-precache');
const md5 = require('../common/md5.js');

const DEV = !!JSON.parse(process.env.BUILD_DEV || 'true');

const dynamicUrlToDependencies = {};

const staticFingerprinted = [
  'translations/en.json',
];

const staticFingerprintedEs6 = [
  'core.js',
  'frontend.html',
  'ha-chart-scripts.html',
];

const staticFingerprintedEs5 = [
  'compatibility.js',
  'core.js',
  'frontend.html',
  'ha-chart-scripts.html',
];

// These panels will always be registered inside HA and thus can
// be safely assumed to be able to preload.
const panelsFingerprinted = [
  'dev-event', 'dev-info', 'dev-service', 'dev-state', 'dev-template',
  'dev-mqtt', 'kiosk',
];

function processStatic(fn, rootDir, urlDir) {
  const parts = path.parse(fn);
  const base = parts.dir.length > 0 ? parts.dir + '/' + parts.name : parts.name;
  const hash = md5(rootDir + '/' + base + parts.ext);
  const url = '/' + urlDir + '/' + base + '-' + hash + parts.ext;
  const fpath = rootDir + '/' + base + parts.ext;
  dynamicUrlToDependencies[url] = [fpath];
}

function generateServiceWorker(es6) {
  let genPromise = null;
  const baseRootDir = 'hass_frontend';
  const rootDir = es6 ? baseRootDir : 'hass_frontend_es5';
  const panelDir = path.resolve(rootDir, 'panels');

  if (DEV) {
    genPromise = Promise.resolve(fs.readFileSync(path.resolve(__dirname, '../service-worker-dev.js.tmpl'), 'UTF-8'));
  } else {
    // Create fingerprinted versions of our dependencies.
    (es6 ? staticFingerprintedEs6 : staticFingerprintedEs5).forEach(fn => processStatic(fn, rootDir, es6 ? 'frontend_latest' : 'frontend_es5'));
    staticFingerprinted.forEach(fn => processStatic(fn, baseRootDir, 'static'));

    panelsFingerprinted.forEach((panel) => {
      const fpath = panelDir + '/ha-panel-' + panel + '.html';
      const hash = md5(fpath);
      const url = '/' + (es6 ? 'frontend_latest' : 'frontend_es5') + '/panels/ha-panel-' + panel + '-' + hash + '.html';
      dynamicUrlToDependencies[url] = [fpath];
    });

    const options = {
      directoryIndex: '',
      dynamicUrlToDependencies: dynamicUrlToDependencies,
      staticFileGlobs: [
        baseRootDir + '/hass_icons.html',
        baseRootDir + '/mdi.html',
        baseRootDir + '/icons/favicon.ico',
        baseRootDir + '/icons/favicon-192x192.png',
        baseRootDir + '/webcomponents-lite.min.js',
        baseRootDir + '/fonts/roboto/Roboto-Light.ttf',
        baseRootDir + '/fonts/roboto/Roboto-Medium.ttf',
        baseRootDir + '/fonts/roboto/Roboto-Regular.ttf',
        baseRootDir + '/fonts/roboto/Roboto-Bold.ttf',
        baseRootDir + '/images/card_media_player_bg.png',
      ],
      // Rules are proceeded in order and negative per-domain rules are not supported.
      runtimeCaching: [
        { // Cache static content (including translations) on first access.
          urlPattern: '/(static|frontend_latest|frontend_es5)/*',
          handler: 'cacheFirst',
        },
        { // Get api (and home-assistant-polymer in dev mode) from network.
          urlPattern: '/(home-assistant-polymer|api)/*',
          handler: 'networkOnly',
        },
        { // Get manifest and service worker from network.
          urlPattern: '/(service_worker.js|service_worker_es5.js|manifest.json)',
          handler: 'networkOnly',
        },
        { // For rest of the files (on Home Assistant domain only) try both cache and network.
          // This includes the root "/" or "/states" response and user files from "/local".
          // First access might bring stale data from cache, but a single refresh will bring updated
          // file.
          urlPattern: '*',
          handler: 'fastest',
        }
      ],
      stripPrefix: baseRootDir,
      replacePrefix: '/static',
      verbose: true,
      // Allow our users to refresh to get latest version.
      clientsClaim: true,
    };

    genPromise = swPrecache.generate(options);
  }

  const swHass = fs.readFileSync(path.resolve(__dirname, '../service-worker.js.tmpl'), 'UTF-8');

  // Fix this
  // if (!DEV) {
  //   genPromise = genPromise.then(
  //     swString => uglifyJS.minify(swString, { fromString: true }).code);
  // }

  return genPromise.then(swString => swString + '\n' + swHass + '\n' + (es6 ? '//es6' : '//es5'))
    .then(swString => file('service_worker.js', swString)
      .pipe(gulp.dest(es6 ? 'build' : 'build-es5')));
}

gulp.task('gen-service-worker-es5', generateServiceWorker.bind(null, /* es6= */ false));
gulp.task('gen-service-worker', generateServiceWorker.bind(null, /* es6= */ true));
