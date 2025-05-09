import path, { dirname as pathDirname } from "node:path";
import { fileURLToPath } from "node:url";

export const dirname = pathDirname(fileURLToPath(import.meta.url));

export default {
  root_dir: path.resolve(dirname, ".."),

  build_dir: path.resolve(dirname, "../build"),
  app_output_root: path.resolve(dirname, "../hass_frontend"),
  app_output_static: path.resolve(dirname, "../hass_frontend/static"),
  app_output_latest: path.resolve(dirname, "../hass_frontend/frontend_latest"),
  app_output_es5: path.resolve(dirname, "../hass_frontend/frontend_es5"),

  demo_dir: path.resolve(dirname, "../demo"),
  demo_output_root: path.resolve(dirname, "../demo/dist"),
  demo_output_static: path.resolve(dirname, "../demo/dist/static"),
  demo_output_latest: path.resolve(dirname, "../demo/dist/frontend_latest"),
  demo_output_es5: path.resolve(dirname, "../demo/dist/frontend_es5"),

  cast_dir: path.resolve(dirname, "../cast"),
  cast_output_root: path.resolve(dirname, "../cast/dist"),
  cast_output_static: path.resolve(dirname, "../cast/dist/static"),
  cast_output_latest: path.resolve(dirname, "../cast/dist/frontend_latest"),
  cast_output_es5: path.resolve(dirname, "../cast/dist/frontend_es5"),

  gallery_dir: path.resolve(dirname, "../gallery"),
  gallery_build: path.resolve(dirname, "../gallery/build"),
  gallery_output_root: path.resolve(dirname, "../gallery/dist"),
  gallery_output_latest: path.resolve(
    dirname,
    "../gallery/dist/frontend_latest"
  ),
  gallery_output_static: path.resolve(dirname, "../gallery/dist/static"),

  landingPage_dir: path.resolve(dirname, "../landing-page"),
  landingPage_build: path.resolve(dirname, "../landing-page/build"),
  landingPage_output_root: path.resolve(dirname, "../landing-page/dist"),
  landingPage_output_latest: path.resolve(
    dirname,
    "../landing-page/dist/frontend_latest"
  ),
  landingPage_output_es5: path.resolve(
    dirname,
    "../landing-page/dist/frontend_es5"
  ),
  landingPage_output_static: path.resolve(
    dirname,
    "../landing-page/dist/static"
  ),

  hassio_dir: path.resolve(dirname, "../hassio"),
  hassio_output_root: path.resolve(dirname, "../hassio/build"),
  hassio_output_static: path.resolve(dirname, "../hassio/build/static"),
  hassio_output_latest: path.resolve(
    dirname,
    "../hassio/build/frontend_latest"
  ),
  hassio_output_es5: path.resolve(dirname, "../hassio/build/frontend_es5"),
  hassio_publicPath: "/api/hassio/app",

  translations_src: path.resolve(dirname, "../src/translations"),
};
