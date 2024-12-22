import { deleteSync } from "del";
import gulp from "gulp";
import paths from "../paths.cjs";
import "./translations.js";

gulp.task(
  "clean",
  gulp.parallel("clean-translations", async () =>
    deleteSync([paths.app_output_root, paths.build_dir])
  )
);

gulp.task(
  "clean-demo",
  gulp.parallel("clean-translations", async () =>
    deleteSync([paths.demo_output_root, paths.build_dir])
  )
);

gulp.task(
  "clean-cast",
  gulp.parallel("clean-translations", async () =>
    deleteSync([paths.cast_output_root, paths.build_dir])
  )
);

gulp.task("clean-hassio", async () =>
  deleteSync([paths.hassio_output_root, paths.build_dir])
);

gulp.task(
  "clean-gallery",
  gulp.parallel("clean-translations", async () =>
    deleteSync([
      paths.gallery_output_root,
      paths.gallery_build,
      paths.build_dir,
    ])
  )
);
