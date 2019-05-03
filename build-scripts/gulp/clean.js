const del = require("del");
const gulp = require("gulp");
const config = require("../paths");

gulp.task("clean", () => del([config.root, config.build_dir]));
gulp.task("clean-demo", () => del([config.demo_root, config.build_dir]));
