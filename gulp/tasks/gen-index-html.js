const gulp = require('gulp');
const replace = require('gulp-batch-replace');
const path = require('path');
const url = require('url');
const config = require('../config');
const md5 = require('../common/md5');
const { minifyStream } = require('../common/transform');

const buildReplaces = {
  '/home-assistant-polymer/hass_frontend/core.js': 'core.js',
  '/home-assistant-polymer/hass_frontend/app.js': 'app.js',
};

function generateIndex(es6) {
  const targetPath = es6 ? config.output : config.output_es5;
  const targetUrl = es6 ? '/frontend_latest/' : '/frontend_es5/';

  const toReplace = [
    // Needs to look like a color during CSS minifiaction
    ['{{ theme_color }}', '#THEME'],
    ['/home-assistant-polymer/hass_frontend/mdi.html',
      `/static/mdi-${md5(path.resolve(config.output, 'mdi.html'))}.html`],
  ];

  if (!es6) {
    toReplace.push([
      '/service_worker.js', '/service_worker_es5.js'
    ]);

    const compatibilityPath = `/frontend_es5/compatibility-${md5(path.resolve(config.output_es5, 'compatibility.js'))}.js`;
    const es5Extra = `
    <script src='${compatibilityPath}'></script>
    <script src='/frontend_es5/custom-elements-es5-adapter.js'></script>
    `;

    toReplace.push([
      '<!--EXTRA_SCRIPTS-->', es5Extra
    ]);
  }

  for (const [replaceSearch, filename] of Object.entries(buildReplaces)) {
    const parsed = path.parse(filename);
    const hash = md5(path.resolve(targetPath, filename));
    toReplace.push([
      replaceSearch,
      url.resolve(targetUrl, `${parsed.name}-${hash}${parsed.ext}`)]);
  }

  const stream = gulp.src(path.resolve(config.polymer_dir, 'index.html'))
    .pipe(replace(toReplace));

  return minifyStream(stream, es6)
    .pipe(replace([['#THEME', '{{ theme_color }}']]))
    .pipe(gulp.dest(targetPath));
}

gulp.task('gen-index-html-es5', generateIndex.bind(null, /* es6= */ false));
gulp.task('gen-index-html', generateIndex.bind(null, /* es6= */ true));
