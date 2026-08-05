// Gulp transform that brotli-compresses files, several at a time.
//
// Drop-in replacement for gulp-brotli. zlib already does the work off the main
// thread, but that plugin wraps it in through2, which waits for each file
// before starting the next, so only one compression is ever in flight. The
// compressed bytes are unchanged; only how many run at once differs.
//
// The real ceiling is libuv's threadpool, which zlib runs on. It sizes itself
// from UV_THREADPOOL_SIZE before any JavaScript runs, so it can only be raised
// from the environment, never from inside the build.

import { availableParallelism } from "node:os";
import { buffer as readStream } from "node:stream/consumers";
import { promisify } from "node:util";
import { brotliCompress } from "node:zlib";
import { ParallelTransform } from "./parallel-transform.mjs";

const EXTENSION = ".br";

const compress = promisify(brotliCompress);

/**
 * @param {object} [options]
 * @param {boolean} [options.skipLarger] Drop files that compression grows.
 * @param {object} [options.params] Brotli parameters, passed to zlib as-is.
 */
export default ({ skipLarger = false, params } = {}) =>
  new ParallelTransform(availableParallelism(), async (file) => {
    if (file.isNull()) {
      return file;
    }
    if (file.isStream()) {
      file.contents = await readStream(file.contents);
    }

    const compressed = await compress(file.contents, { params });
    if (skipLarger && compressed.length >= file.contents.length) {
      // Dropped rather than passed through, as gulp-brotli did: the
      // uncompressed file is already in the output directory.
      return undefined;
    }

    file.contents = compressed;
    file.path += EXTENSION;
    return file;
  });
