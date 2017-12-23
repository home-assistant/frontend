const gulp = require('gulp');
const zopfli = require('gulp-zopfli');

gulp.task('compress', () =>
  gulp.src('{hass_frontend,hass_frontend_es5}/**/*{.js,.html,.ttf,.json}', { base: '.' })
    .pipe(zopfli())
    .pipe(gulp.dest('./')));
