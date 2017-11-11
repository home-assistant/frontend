const gulp = require('gulp');
const replace = require('gulp-batch-replace');
const path = require('path');
const url = require('url');
const config = require('../config');
const md5 = require('../common/md5.js');

const buildReplaces = {
  '/home-assistant-polymer/build/core.js': 'core.js',
  '/home-assistant-polymer/src/home-assistant.html': 'frontend.html',
};

function generateIndex(es6) {
  const targetPath = es6 ? config.output : config.output_es5;
  const targetUrl = es6 ? '/frontend_latest/' : '/frontend_es5/';

  const toReplace = [
    ['/home-assistant-polymer/hass_frontend/mdi.html',
      `/static/mdi-${md5(path.resolve(config.output, 'mdi.html'))}.html`],
    ['/home-assistant-polymer/build-temp/compatibility.js',
      `/static/compatibility-${md5(path.resolve(config.output_es5, 'compatibility.js'))}.js`],
  ];

  if (!es6) {
    toReplace.push([
      '/service_worker.js', '/service_worker_es5.js'
    ]);
  }

  for (const [replaceSearch, filename] of Object.entries(buildReplaces)) {
    const parsed = path.parse(filename);
    const hash = md5(path.resolve(targetPath, filename));
    toReplace.push([
      replaceSearch,
      url.resolve(targetUrl, `${parsed.name}-${hash}${parsed.ext}`)]);
  }

  gulp.src(path.resolve(config.polymer_dir, 'index.html'))
    .pipe(replace(toReplace))
    .pipe(gulp.dest(targetPath));
}

gulp.task('gen-index-html-es5', generateIndex.bind(null, /* es6= */ false));
gulp.task('gen-index-html', generateIndex.bind(null, /* es6= */ true));
