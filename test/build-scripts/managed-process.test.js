/**
 * @vitest-environment node
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireProcessRecord,
  processStartTime,
  readProcessRecord,
  releaseProcessRecord,
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
});
