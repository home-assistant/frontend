/**
 * @vitest-environment node
 */

import { Buffer } from "node:buffer";
import process from "node:process";
import { Readable } from "node:stream";
import gfxZopfli from "@gfx/zopfli";
import { describe, expect, it } from "vitest";
import { file, filler, run as runStream } from "./vinyl-stub.js";

// Keep the pool small; it is created once, on the first factory call.
process.env.ZOPFLI_WORKERS = "2";

const { default: zopfli } = await import("../../build-scripts/zopfli.mjs");

const THRESHOLD = 150;

const run = (files, options = { threshold: THRESHOLD }) =>
  runStream(zopfli(options), files);

// What the old in-process plugin did, for byte-for-byte comparison.
const gzipInProcess = (contents) =>
  new Promise((resolve, reject) => {
    gfxZopfli.gzip(contents, {}, (error, result) =>
      error ? reject(error) : resolve(Buffer.from(result))
    );
  });

describe("zopfli worker pool", () => {
  it("appends .gz and matches in-process zopfli byte for byte", async () => {
    const contents = filler(4096);
    const [result] = await run([file("/out/app.js", contents)]);

    expect(result.path).toBe("/out/app.js.gz");
    expect(result.contents).toEqual(await gzipInProcess(contents));
  });

  it("returns contents as a Buffer, which vinyl requires", async () => {
    const [result] = await run([file("/out/app.js", filler(1024))]);

    expect(Buffer.isBuffer(result.contents)).toBe(true);
  });

  it("appends to the path rather than replacing the extension", async () => {
    const [result] = await run([file("/out/nested/chunk.min.js", filler(500))]);

    expect(result.path).toBe("/out/nested/chunk.min.js.gz");
  });

  it("passes files under the threshold through untouched", async () => {
    const contents = filler(THRESHOLD - 1);
    const [result] = await run([file("/out/tiny.js", contents)]);

    expect(result.path).toBe("/out/tiny.js");
    expect(result.contents).toBe(contents);
  });

  it("compresses a file exactly at the threshold", async () => {
    const [result] = await run([file("/out/edge.js", filler(THRESHOLD))]);

    expect(result.path).toBe("/out/edge.js.gz");
  });

  it("compresses everything when no threshold is given", async () => {
    const [result] = await run([file("/out/tiny.js", filler(1))], {});

    expect(result.path).toBe("/out/tiny.js.gz");
  });

  it("passes null files through", async () => {
    const [result] = await run([file("/out/adirectory", null)]);

    expect(result.path).toBe("/out/adirectory");
    expect(result.contents).toBeNull();
  });

  it("compresses only the requested slice of a pooled buffer", async () => {
    // Small reads share a pooled ArrayBuffer, so contents often start at a
    // non-zero byteOffset into a much larger allocation.
    const pool = Buffer.alloc(8192, "z");
    const contents = pool.subarray(1000, 1000 + 512);
    contents.fill("a");

    const [result] = await run([file("/out/pooled.js", contents)]);

    expect(result.contents).toEqual(await gzipInProcess(filler(512)));
  });

  it("buffers stream-mode contents", async () => {
    const contents = filler(600);
    const [result] = await run([
      file("/out/streamed.js", Readable.from([contents])),
    ]);

    expect(result.path).toBe("/out/streamed.js.gz");
    expect(result.contents).toEqual(await gzipInProcess(contents));
  });

  it("handles more files than the pool has workers", async () => {
    const count = 25;
    const files = Array.from({ length: count }, (_, index) =>
      file(`/out/chunk${index}.js`, filler(200 + index))
    );

    const results = await run(files);

    expect(results).toHaveLength(count);
    expect(new Set(results.map((result) => result.path)).size).toBe(count);
    await Promise.all(
      results.map(async (result) => {
        const index = Number(result.path.match(/chunk(\d+)/)[1]);
        expect(result.contents).toEqual(
          await gzipInProcess(filler(200 + index))
        );
      })
    );
  });

  it("serves two concurrent streams from the same pool", async () => {
    const [first, second] = await Promise.all([
      run([file("/out/a.js", filler(300))]),
      run([file("/out/b.js", filler(400))]),
    ]);

    expect(first[0].path).toBe("/out/a.js.gz");
    expect(second[0].path).toBe("/out/b.js.gz");
    expect(first[0].contents).toEqual(await gzipInProcess(filler(300)));
    expect(second[0].contents).toEqual(await gzipInProcess(filler(400)));
  });
});
