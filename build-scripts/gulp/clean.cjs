const del = import("del");
const gulp = require("gulp");
const paths = require("../paths.cjs");
require("./translations.cjs");

gulp.task(
  "clean",
  gulp.parallel("clean-translations", async () =>
    (await del).deleteSync([paths.app_output_root, paths.build_dir])
  )
);

gulp.task(
  "clean-demo",
  gulp.parallel("clean-translations", async () =>
    (await del).deleteSync([paths.demo_output_root, paths.build_dir])
  )
);

gulp.task(
  "clean-cast",
  gulp.parallel("clean-translations", async () =>
    (await del).deleteSync([paths.cast_output_root, paths.build_dir])
  )
);

gulp.task("clean-hassio", async () =>
  (await del).deleteSync([paths.hassio_output_root, paths.build_dir])
);

gulp.task(
  "clean-gallery",
  gulp.parallel("clean-translations", async () =>
    (await del).deleteSync([
      paths.gallery_output_root,
      paths.gallery_build,
      paths.build_dir,
    ])
  )
);
