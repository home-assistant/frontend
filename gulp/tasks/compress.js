const gulp = require('gulp');
const brotli = require('gulp-brotli');

gulp.task('brotli', () => gulp.src('{hass_frontend,hass_frontend_es5}/**/*{.js,.html,.ttf,.json}', { base: '.' })
  .pipe(brotli.compress())
  .pipe(gulp.dest('./')));
