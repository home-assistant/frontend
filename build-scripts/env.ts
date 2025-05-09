import fs from "fs";
import path from "path";
import paths from "./paths";

const isTrue = (value) => value === "1" || value?.toLowerCase() === "true";

export default {
  isProdBuild() {
    return (
      process.env.NODE_ENV === "production" || module.exports.isStatsBuild()
    );
  },
  isStatsBuild() {
    return isTrue(process.env.STATS);
  },
  isTestBuild() {
    return isTrue(process.env.IS_TEST);
  },
  isNetlify() {
    return isTrue(process.env.NETLIFY);
  },
  version() {
    const version = fs
      .readFileSync(path.resolve(paths.root_dir, "pyproject.toml"), "utf8")
      .match(/version\W+=\W"(\d{8}\.\d(?:\.dev)?)"/);
    if (!version) {
      throw Error("Version not found");
    }
    return version[1];
  },
  isDevContainer() {
    return isTrue(process.env.DEV_CONTAINER);
  },
};
