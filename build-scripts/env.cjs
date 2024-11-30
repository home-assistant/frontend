const fs = require("fs");
const path = require("path");
const paths = require("./paths.cjs");

const isTrue = (value) => value === "1" || value?.toLowerCase() === "true";

module.exports = {
  useWDS() {
    return isTrue(process.env.WDS);
  },
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
      .readFileSync(path.resolve(paths.polymer_dir, "pyproject.toml"), "utf8")
      .match(/version\W+=\W"(\d{8}\.\d(?:\.dev)?)"/);
    if (!version) {
      throw Error("Version not found");
    }
    return version[1];
  },
  hassUrl() {
    return "HASS_URL" in process.env
      ? process.env["HASS_URL"]
      : "${location.protocol}//${location.host}";
  },
  isDevContainer() {
    return isTrue(process.env.DEV_CONTAINER);
  },
};
