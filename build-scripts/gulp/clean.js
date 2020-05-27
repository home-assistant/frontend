const del = require("del");
const gulp = require("gulp");
const paths = require("../paths");
require("./translations");

gulp.task(
  "clean",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([paths.app_output_root, paths.build_dir]);
  })
);

gulp.task(
  "clean-demo",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([paths.demo_output_root, paths.build_dir]);
  })
);

gulp.task(
  "clean-cast",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([paths.cast_output_root, paths.build_dir]);
  })
);

gulp.task("clean-hassio", function cleanOutputAndBuildDir() {
  return del([paths.hassio_output_root, paths.build_dir]);
});

gulp.task(
  "clean-gallery",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([paths.gallery_output_root, paths.build_dir]);
  })
);
