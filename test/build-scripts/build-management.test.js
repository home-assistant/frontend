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

const writeOwner = async (owner) => {
  const cache = await temporaryDirectory();
  const lockFile = path.join(cache, "ha-workflow.lock");
  const record = {
    pid: process.pid,
    startTime: processStartTime(process.pid),
    ...owner,
  };
  await writeFile(lockFile, JSON.stringify(record));
  return { cache, lockFile, record };
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("build management CLIs", () => {
  it("blocks a managed workflow when another owns the output", async () => {
    const { cache } = await writeOwner({ kind: "build", token: "build" });

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "app", "--background"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Frontend build already running");
  });

  it("does not stop another development suite", async () => {
    const { cache, lockFile, record } = await writeOwner({
      kind: "dev",
      suite: "demo",
      token: "demo",
    });

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "gallery", "--stop"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Dev server (gallery) not running");
    expect(JSON.parse(await readFile(lockFile, "utf8"))).toEqual(record);
  });

  it("keeps an exact process suite start idempotent", async () => {
    const { cache } = await writeOwner({
      kind: "dev",
      suite: "app",
      token: "app",
    });

    const result = await runNode(
      ["build-scripts/dev-server.mjs", "--suite", "app", "--background"],
      { HA_BUILD_CACHE_DIR: cache }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Dev server (app) already running");
  });
});

describe("workflow ownership", () => {
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
