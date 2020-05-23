const del = require("del");
const gulp = require("gulp");
const config = require("../paths");
require("./translations");

gulp.task(
  "clean",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([config.app_output_root, config.build_dir]);
  })
);

gulp.task(
  "clean-demo",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([config.demo_output_root, config.build_dir]);
  })
);

gulp.task(
  "clean-cast",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([config.cast_output_root, config.build_dir]);
  })
);

gulp.task(
  "clean-hassio",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([config.hassio_output_root, config.build_dir]);
  })
);

gulp.task(
  "clean-gallery",
  gulp.parallel("clean-translations", function cleanOutputAndBuildDir() {
    return del([config.gallery_output_root, config.build_dir]);
  })
);
