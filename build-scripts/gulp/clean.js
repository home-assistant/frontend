const del = require("del");
const gulp = require("gulp");
const config = require("../paths");

gulp.task("clean", () => del([config.root, config.build_dir]));
