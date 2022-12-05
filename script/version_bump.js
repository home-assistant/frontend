#!/usr/bin/env node
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

function patch(version) {
  const parts = version.split(".");
  return `${parts[0]}.${Number(parts[1]) + 1}`;
}

function today() {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getUTCDate()).padStart(2, "0")}.0`;
}

function auto(version) {
  const todayVersion = today();
  if (todayVersion !== version) {
    return todayVersion;
  }
  return patch(version);
}

function nightly() {
  return `${today()}.dev`;
}

const methods = {
  patch,
  today,
  auto,
  nightly,
};

async function main(args) {
  let method;
  let commit;

  if (args.length === 0) {
    method = methods.auto;
    commit = true;
  } else {
    method = args.length > 0 && methods[args[0]];
    commit = args.length > 1 && args[1] == "--commit";
  }

  if (!method) {
    console.error(
      "Missing required method. Choose from",
      Object.keys(methods).join(", ")
    );
    return;
  }

  const setup = fs.readFileSync("pyproject.toml", "utf8");
  const version = setup.match(/version\W+=\W"(\d{8}\.\d)"/)[1];
  const newVersion = method(version);

  console.log("Current version:", version);
  console.log("New version:", newVersion);

  fs.writeFileSync(
    "pyproject.toml",
    setup.replace(version, newVersion),
    "utf-8"
  );

  if (!commit) {
    return;
  }

  const { stdout } = await exec(
    `git commit -am "Bumped version to ${newVersion}"`
  );
  console.log(stdout);
}

main(process.argv.slice(2)).catch(console.error);
