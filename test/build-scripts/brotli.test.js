/**
 * @vitest-environment node
 */

import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { brotliCompress, constants } from "node:zlib";
import { describe, expect, it } from "vitest";
import brotli from "../../build-scripts/brotli.mjs";
import { file, filler, run as runStream } from "./vinyl-stub.js";

// What build-scripts/gulp/compress.js asks for.
const PARAMS = {
  [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
};

const run = (files, options = { skipLarger: true, params: PARAMS }) =>
  runStream(brotli(options), files);

const compressInProcess = promisify(brotliCompress);

describe("brotli", () => {
  it("appends .br and matches zlib byte for byte", async () => {
    const contents = filler(4096);
    const [result] = await run([file("/out/app.js", contents)]);

    expect(result.path).toBe("/out/app.js.br");
    expect(result.contents).toEqual(
      await compressInProcess(contents, { params: PARAMS })
    );
  });

  it("returns contents as a Buffer, which vinyl requires", async () => {
    const [result] = await run([file("/out/app.js", filler(1024))]);

    expect(Buffer.isBuffer(result.contents)).toBe(true);
  });

  it("appends to the path rather than replacing the extension", async () => {
    const [result] = await run([file("/out/nested/chunk.min.js", filler(500))]);

    expect(result.path).toBe("/out/nested/chunk.min.js.br");
  });

  it("drops files that compression grows when skipLarger is set", async () => {
    expect(await run([file("/out/tiny.js", filler(1))])).toEqual([]);
  });

  it("keeps files that compression grows when skipLarger is not set", async () => {
    const [result] = await run([file("/out/tiny.js", filler(1))], {
      params: PARAMS,
    });

    expect(result.path).toBe("/out/tiny.js.br");
  });

  it("passes null files through", async () => {
    const [result] = await run([file("/out/adirectory", null)]);

    expect(result.path).toBe("/out/adirectory");
    expect(result.contents).toBeNull();
  });

  it("buffers stream-mode contents", async () => {
    const contents = filler(600);
    const [result] = await run([
      file("/out/streamed.js", Readable.from([contents])),
    ]);

    expect(result.path).toBe("/out/streamed.js.br");
    expect(result.contents).toEqual(
      await compressInProcess(contents, { params: PARAMS })
    );
  });

  it("handles more files than it keeps in flight", async () => {
    const count = 40;
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
          await compressInProcess(filler(200 + index), { params: PARAMS })
        );
      })
    );
  });
});
