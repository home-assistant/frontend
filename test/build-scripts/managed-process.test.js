/**
 * @vitest-environment node
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireProcessRecord,
  isProcessAlive,
  isProcessRecordAlive,
  processStartTime,
  readProcessRecord,
  releaseProcessRecord,
  terminateDetachedProcess,
} from "../../build-scripts/managed-process.mjs";

const temporaryDirectories = [];

const temporaryFile = async (name) => {
  const directory = await mkdtemp(path.join(tmpdir(), "ha-build-test-"));
  temporaryDirectories.push(directory);
  return path.join(directory, name);
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("managed process records", () => {
  it("allows only one live owner", async () => {
    const file = await temporaryFile("owner.lock");
    const owner = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      token: "first",
    };

    expect(acquireProcessRecord(file, owner).acquired).toBe(true);
    expect(
      acquireProcessRecord(file, { ...owner, token: "second" })
    ).toMatchObject({ acquired: false, existing: owner });
  });

  it("recovers a stale owner", async () => {
    const file = await temporaryFile("stale.lock");
    await writeFile(
      file,
      JSON.stringify({ pid: 2147483647, startTime: "stale", token: "stale" })
    );
    const owner = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      token: "current",
    };

    expect(acquireProcessRecord(file, owner).acquired).toBe(true);
    expect(readProcessRecord(file)).toEqual(owner);
  });

  it("releases only for the owning token", async () => {
    const file = await temporaryFile("token.lock");
    const owner = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      token: "owner",
    };
    acquireProcessRecord(file, owner);

    releaseProcessRecord(file, "other");
    expect(readProcessRecord(file)).toEqual(owner);
    releaseProcessRecord(file, owner.token);
    expect(readProcessRecord(file)).toBeUndefined();
  });

  it("rejects a reused pid with a different start time", () => {
    expect(
      isProcessRecordAlive({ pid: process.pid, startTime: "not-current" })
    ).toBe(false);
  });
});

describe("detached process cleanup", () => {
  it("terminates the detached process group", async () => {
    const child = spawn(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      {
        detached: true,
        stdio: "ignore",
      }
    );
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });

    expect(await terminateDetachedProcess(child)).toBe(true);
    expect(isProcessAlive(child.pid)).toBe(false);
  });
});
