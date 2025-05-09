import { deleteSync } from "del";
import { parallel, task } from "gulp";
import paths from "../paths.ts";
import "./translations.ts";

task(
  "clean",
  parallel("clean-translations", async () =>
    deleteSync([paths.app_output_root, paths.build_dir])
  )
);

task(
  "clean-demo",
  parallel("clean-translations", async () =>
    deleteSync([paths.demo_output_root, paths.build_dir])
  )
);

task(
  "clean-cast",
  parallel("clean-translations", async () =>
    deleteSync([paths.cast_output_root, paths.build_dir])
  )
);

task("clean-hassio", async () =>
  deleteSync([paths.hassio_output_root, paths.build_dir])
);

task(
  "clean-gallery",
  parallel("clean-translations", async () =>
    deleteSync([
      paths.gallery_output_root,
      paths.gallery_build,
      paths.build_dir,
    ])
  )
);

task(
  "clean-landing-page",
  parallel("clean-translations", async () =>
    deleteSync([
      paths.landingPage_output_root,
      paths.landingPage_build,
      paths.build_dir,
    ])
  )
);
