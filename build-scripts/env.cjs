const fs = require("fs");
const path = require("path");
const paths = require("./paths.cjs");

module.exports = {
  useRollup() {
    return process.env.ROLLUP === "1";
  },
  useWDS() {
    return process.env.WDS === "1";
  },
  isProdBuild() {
    return (
      process.env.NODE_ENV === "production" || module.exports.isStatsBuild()
    );
  },
  isStatsBuild() {
    return process.env.STATS === "1";
  },
  isTestBuild() {
    return process.env.IS_TEST === "true";
  },
  isNetlify() {
    return process.env.NETLIFY === "true";
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
};
