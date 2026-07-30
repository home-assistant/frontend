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
      path.join(cache, "ha-workflow.lock"),
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

  it("fails when another development suite owns the workflow", async () => {
    const cache = await temporaryDirectory();
    await writeFile(
      path.join(cache, "ha-workflow.lock"),
      JSON.stringify({
        pid: process.pid,
        startTime: processStartTime(process.pid),
        kind: "dev",
        suite: "demo",
        token: "demo",
      })
    );

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "gallery", "--background"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Dev server (demo) already running");
    expect(result.stdout).toContain("yarn dev:demo --stop");
  });

  it("does not stop another development suite", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-workflow.lock");
    const record = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      kind: "dev",
      suite: "demo",
      token: "demo",
    };
    await writeFile(lockFile, JSON.stringify(record));

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "gallery", "--stop"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Dev server (gallery) not running");
    expect(JSON.parse(await readFile(lockFile, "utf8"))).toEqual(record);
  });

  it("keeps an exact process suite start idempotent", async () => {
    const cache = await temporaryDirectory();
    await writeFile(
      path.join(cache, "ha-workflow.lock"),
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
      path.join(cache, "ha-workflow.lock"),
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

describe("workflow ownership", () => {
  it("removes the inherited lock when the child exits", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-workflow.lock");
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
      'import { createWorkflowLockTask } from "./build-scripts/output-lock.mjs";',
      'await createWorkflowLockTask("test")();',
    ].join("");

    const result = await runNode(["--input-type=module", "-e", script], {
      HA_BUILD_CACHE_DIR: cache,
      HA_WORKFLOW_LOCK_TOKEN: "inherited",
    });

    expect(result.code).toBe(0);
    await expect(readFile(lockFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("removes owned locks when the child is terminated", async () => {
    const cache = await temporaryDirectory();
    const lockFile = path.join(cache, "ha-workflow.lock");
    const script = [
      'import { createWorkflowLockTask } from "./build-scripts/output-lock.mjs";',
      'await createWorkflowLockTask("test")();',
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
});
