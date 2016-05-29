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

var rootDir = '..';

function md5(filename) {
  return crypto.createHash('md5')
    .update(fs.readFileSync(filename)).digest('hex');
}

var appPaths = ['/', '/states', '/logbook', '/history', '/map',
    '/devService', '/devState', '/devEvent', '/devInfo', '/devTemplate'];
var fingerprinted = ['frontend.html', 'mdi.html', 'core.js'];

var dynamicUrlToDependencies = {};

appPaths.forEach(ap => {
  dynamicUrlToDependencies[ap] = [rootDir + '/frontend.html'];
});

fingerprinted.forEach(fn => {
  var parts = path.parse(fn);

  var hash = md5(rootDir + '/' + parts.name + parts.ext);
  var url = '/static/' + parts.name + '-' + hash + parts.ext;
  var fpath = rootDir + '/' + parts.name + parts.ext;
  dynamicUrlToDependencies[url] = [fpath];
});

swPrecache.write(path.join('build', 'service_worker.js'), {
  dynamicUrlToDependencies: dynamicUrlToDependencies,
  staticFileGlobs: [
    rootDir + '/favicon-192x192.png',
    rootDir + '/webcomponents-lite.min.js',
    rootDir + '/fonts/roboto/Roboto-Light.ttf',
    rootDir + '/fonts/roboto/Roboto-Medium.ttf',
    rootDir + '/fonts/roboto/Roboto-Regular.ttf',
    rootDir + '/fonts/roboto/Roboto-Bold.ttf',
    rootDir + '/images/card_media_player_bg.png',
  ],
  stripPrefix: '..',
  replacePrefix: 'static',
});
