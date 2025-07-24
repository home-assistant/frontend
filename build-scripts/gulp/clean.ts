import { deleteSync } from "del";
import { parallel } from "gulp";
import paths from "../paths.ts";
import { cleanTranslations } from "./translations.ts";

export const clean = parallel(cleanTranslations, async () =>
  deleteSync([paths.app_output_root, paths.build_dir])
);

export const cleanDemo = parallel(cleanTranslations, async () =>
  deleteSync([paths.demo_output_root, paths.build_dir])
);

export const cleanCast = parallel(cleanTranslations, async () =>
  deleteSync([paths.cast_output_root, paths.build_dir])
);

export const cleanHassio = async () =>
  deleteSync([paths.hassio_output_root, paths.build_dir]);

export const cleanGallery = parallel(cleanTranslations, async () =>
  deleteSync([paths.gallery_output_root, paths.gallery_build, paths.build_dir])
);

export const cleanLandingPage = parallel(cleanTranslations, async () =>
  deleteSync([
    paths.landingPage_output_root,
    paths.landingPage_build,
    paths.build_dir,
  ])
);
