const gulp = require('gulp');
const path = require('path');
const replace = require('gulp-batch-replace');
const rename = require('gulp-rename');
const md5 = require('../common/md5');
const url = require('url');

const config = require('../config');
const minifyStream = require('../common/transform').minifyStream;

const buildReplaces = {
  '/frontend_latest/onboarding.js': 'onboarding.js',
};

async function buildOnboarding(es6) {
  const targetPath = es6 ? config.output : config.output_es5;
  const targetUrl = es6 ? '/frontend_latest/' : '/frontend_es5/';
  const frontendPath = es6 ? 'frontend_latest' : 'frontend_es5';
  const toReplace = [
    ['/home-assistant-polymer/hass_frontend/onboarding.js', `/${frontendPath}/onboarding.js`],
  ];

  if (es6) {
    toReplace.push(['<!--EXTRA_SCRIPTS-->', '']);
  } else {
    const compatibilityPath = `/frontend_es5/compatibility-${md5(path.resolve(config.output_es5, 'compatibility.js'))}.js`;
    const es5Extra = `
    <script src='${compatibilityPath}'></script>
    <script src='/static/custom-elements-es5-adapter.js'></script>
    `;
    toReplace.push(['<!--EXTRA_SCRIPTS-->', es5Extra]);
  }

  for (const [replaceSearch, filename] of Object.entries(buildReplaces)) {
    const parsed = path.parse(filename);
    const hash = md5(path.resolve(targetPath, filename));
    toReplace.push([
      replaceSearch,
      url.resolve(targetUrl, `${parsed.name}-${hash}${parsed.ext}`)]);
  }

  const stream = gulp.src(path.resolve(config.polymer_dir, 'src/onboarding.html'))
    .pipe(replace(toReplace));

  return minifyStream(stream, /* es6= */ es6)
    .pipe(rename('onboarding.html'))
    .pipe(gulp.dest(es6 ? config.output : config.output_es5));
}

gulp.task('gen-onboarding-html-es5', () => buildOnboarding(/* es6= */ false));
gulp.task('gen-onboarding-html', () => buildOnboarding(/* es6= */ true));
