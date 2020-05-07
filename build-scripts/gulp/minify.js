const path = require("path");
const gulp = require("gulp");
const terser = require("gulp-terser");
const merge = require("merge-stream");
const paths = require("../paths");

function minifyStream(source, latestBuild) {
  return gulp
    .src(path.resolve(source, "**/*.js"))
    .pipe(
      terser({
        output: { comments: false },
        safari10: true,
        ecma: latestBuild ? undefined : 5,
      })
    )
    .pipe(gulp.dest(source));
}

gulp.task("minify-app", function minifyJS() {
  return merge([
    minifyStream(paths.output, true),
    minifyStream(paths.output_es5, false),
  ]);
});

gulp.task("minify-demo", function minifyJS() {
  return merge([
    minifyStream(paths.demo_output, true),
    minifyStream(paths.demo_output_es5, false),
  ]);
});

gulp.task("minify-cast", function minifyJS() {
  return merge([
    minifyStream(paths.cast_output, true),
    minifyStream(paths.cast_output_es5, false),
  ]);
});

gulp.task("minify-hassio", function minifyJS() {
  return minifyStream(paths.hassio_root, false);
});

gulp.task("minify-gallery", function minifyJS() {
  minifyStream(paths.gallery_output, false);
});
