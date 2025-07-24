import fs from "node:fs";
import path from "node:path";
import paths from "./paths.ts";

const isTrue = (value) => value === "1" || value?.toLowerCase() === "true";

export const isProdBuild = () =>
  process.env.NODE_ENV === "production" || isStatsBuild();
export const isStatsBuild = () => isTrue(process.env.STATS);
export const isTestBuild = () => isTrue(process.env.IS_TEST);
export const isNetlify = () => isTrue(process.env.NETLIFY);
export const version = () => {
  const pyProjectVersion = fs
    .readFileSync(path.resolve(paths.root_dir, "pyproject.toml"), "utf8")
    .match(/version\W+=\W"(\d{8}\.\d(?:\.dev)?)"/);
  if (!pyProjectVersion) {
    throw Error("Version not found");
  }
  return pyProjectVersion[1];
};
export const isDevContainer = () => isTrue(process.env.DEV_CONTAINER);
