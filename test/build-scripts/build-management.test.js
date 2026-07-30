/**
 * @vitest-environment node
 */

import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { processStartTime } from "../../build-scripts/managed-process.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const temporaryDirectories = [];

const runNode = (args, env = {}) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: repoRoot,
        env: { ...process.env, ...env },
      },
      (error, stdout, stderr) => {
        resolve({ code: error?.code ?? 0, stdout, stderr });
      }
    );
  });

const temporaryDirectory = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ha-build-cli-test-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("build management CLIs", () => {
  it("rejects unsupported suite arguments", async () => {
    const result = await runNode([
      "build-scripts/dev-server.mjs",
      "--suite",
      "demo",
      "--unsupported",
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unexpected arguments: --unsupported");
  });

  it("allows modern lifecycle queries", async () => {
    const result = await runNode(
      ["build-scripts/build-manager.mjs", "--modern", "--status"],
      { HA_BUILD_CACHE_DIR: await temporaryDirectory() }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Frontend build not running");
  });

  it("fails for a conflicting process suite owner", async () => {
    const cache = await temporaryDirectory();
    await writeFile(
      path.join(cache, "ha-app-output.lock"),
      JSON.stringify({
        pid: process.pid,
        startTime: processStartTime(process.pid),
        kind: "build",
        token: "build",
      })
    );

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "app", "--background"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Frontend build already running");
  });

  it("keeps an exact process suite start idempotent", async () => {
    const cache = await temporaryDirectory();
    await writeFile(
      path.join(cache, "ha-app-output.lock"),
      JSON.stringify({
        pid: process.pid,
        startTime: processStartTime(process.pid),
        kind: "dev",
        suite: "app",
        token: "app",
      })
    );

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "app", "--background"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Dev server (app) already running");
  });

  it("rejects an exact process suite that is still starting", async () => {
    const cache = await temporaryDirectory();
    await writeFile(
      path.join(cache, "ha-app-output.lock"),
      JSON.stringify({
        pid: process.pid,
        startTime: processStartTime(process.pid),
        kind: "dev",
        suite: "app",
        starting: true,
        token: "app",
      })
    );

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "app", "--background"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(1);
  });
});

describe("inherited output ownership", () => {
  it("retains manager ownership after the Gulp release task", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-app-output.lock");
    const record = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      kind: "build",
      token: "inherited",
    };
    await writeFile(lockFile, JSON.stringify(record));
    const script = [
      'import { createOutputLockTasks } from "./build-scripts/output-lock.mjs";',
      'const lock = createOutputLockTasks("app", "test");',
      "await lock.acquire();",
      "await lock.release();",
      'process.stdout.write("released\\n");',
      "setTimeout(() => process.exit(), 10000);",
    ].join("");
    const child = spawn(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          HA_BUILD_CACHE_DIR: cache,
          HA_OUTPUT_LOCK_TOKEN: record.token,
        },
        stdio: ["ignore", "pipe", "inherit"],
      }
    );
    await new Promise((resolve, reject) => {
      child.stdout.once("data", resolve);
      child.once("error", reject);
    });

    expect(JSON.parse(await readFile(lockFile, "utf8"))).toEqual(record);
    child.kill();
    await new Promise((resolve) => {
      child.once("exit", resolve);
    });
  });

  it("removes the inherited lock when the child exits", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-app-output.lock");
    await writeFile(
      lockFile,
      JSON.stringify({
        pid: process.pid,
        startTime: processStartTime(process.pid),
        kind: "dev",
        suite: "app",
        token: "inherited",
      })
    );
    const script = [
      'import { createOutputLockTasks } from "./build-scripts/output-lock.mjs";',
      'await createOutputLockTasks("app", "test").acquire();',
    ].join("");

    const result = await runNode(["--input-type=module", "-e", script], {
      HA_BUILD_CACHE_DIR: cache,
      HA_OUTPUT_LOCK_TOKEN: "inherited",
    });

    expect(result.code).toBe(0);
    await expect(readFile(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("removes owned locks when the child is terminated", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-app-output.lock");
    const script = [
      'import { createOutputLockTasks } from "./build-scripts/output-lock.mjs";',
      'await createOutputLockTasks("app", "test").acquire();',
      'process.stdout.write("ready\\n");',
      "setInterval(() => {}, 10000);",
    ].join("");
    const child = spawn(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: repoRoot,
        env: { ...process.env, HA_BUILD_CACHE_DIR: cache },
        stdio: ["ignore", "pipe", "inherit"],
      }
    );
    await new Promise((resolve, reject) => {
      child.stdout.once("data", resolve);
      child.once("error", reject);
    });

    child.kill("SIGTERM");
    await new Promise((resolve) => {
      child.once("exit", resolve);
    });

    await expect(readFile(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("waits for generated output ownership", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-generated-output.lock");
    const record = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      kind: "generated-output",
      target: "holder",
      token: "holder",
    };
    await writeFile(lockFile, JSON.stringify(record));
    const script = [
      'import { createGeneratedLockTasks } from "./build-scripts/output-lock.mjs";',
      'const lock = createGeneratedLockTasks("waiter");',
      "await lock.acquire();",
      'process.stdout.write("acquired\\n");',
      "await lock.release();",
    ].join("");
    const child = spawn(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: repoRoot,
        env: { ...process.env, HA_BUILD_CACHE_DIR: cache },
        stdio: ["ignore", "pipe", "inherit"],
      }
    );
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    await new Promise((resolve) => {
      const waiting = "Waiting for Gulp task holder";
      if (output.includes(waiting)) {
        resolve();
        return;
      }
      child.stdout.on("data", () => {
        if (output.includes(waiting)) {
          resolve();
        }
      });
    });
    await rm(lockFile);
    await new Promise((resolve, reject) => {
      child.once("exit", resolve);
      child.once("error", reject);
    });

    expect(output).toContain("Waiting for Gulp task holder");
    expect(output).toContain("acquired");
  });
});
