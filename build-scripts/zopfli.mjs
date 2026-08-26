// Gulp transform that gzips files with zopfli across a pool of worker threads.
//
// Drop-in replacement for gulp-zopfli-green. That plugin compresses on the main
// thread, and @gfx/zopfli is synchronous WASM, so it pins a single core and
// blocks the event loop for the whole compression step. Running one WASM
// instance per worker parallelises it; the output bytes are unchanged.

import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { buffer as readStream } from "node:stream/consumers";
import { Worker } from "node:worker_threads";
import { withCache } from "./compress-cache.mjs";
import { ParallelTransform } from "./parallel-transform.mjs";

const WORKER_URL = new URL("./zopfli-worker.mjs", import.meta.url);
const EXTENSION = ".gz";

// Cache namespace tied to the zopfli version, since a different version can
// produce different bytes for the same input.
const ZOPFLI_VERSION = createRequire(import.meta.url)(
  "@gfx/zopfli/package.json"
).version;
const NAMESPACE = `gzip-zopfli${ZOPFLI_VERSION}`;

// Left empty on purpose: @gfx/zopfli then applies its own defaults, which is
// what gulp-zopfli-green did, so compressed output stays byte-identical.
const ZOPFLI_OPTIONS = {};

const poolSize = () => {
  const configured = Number(process.env.ZOPFLI_WORKERS);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : availableParallelism();
};

// One job per worker at a time, so the worker itself is the job slot.
const createPool = (size) => {
  const live = new Set();
  const idle = [];
  const waiting = [];
  const inFlight = new Map();

  // A dead worker must leave the pool, or it gets handed a job that never
  // completes and the build hangs instead of failing.
  const retire = (worker, error) => {
    if (!live.delete(worker)) {
      return;
    }
    const index = idle.indexOf(worker);
    if (index !== -1) {
      idle.splice(index, 1);
    }
    const job = inFlight.get(worker);
    inFlight.delete(worker);
    job?.reject(error);
    waiting.shift()?.();
  };

  const spawn = () => {
    const worker = new Worker(WORKER_URL);
    live.add(worker);
    // Idle workers must not hold the process open. Each job refs its worker for
    // as long as it runs, so a pending compression always keeps the event loop
    // alive.
    worker.unref();

    worker.on("message", ({ error, result }) => {
      const job = inFlight.get(worker);
      if (!job) {
        return;
      }
      inFlight.delete(worker);
      worker.unref();
      idle.push(worker);
      if (error) {
        job.reject(new Error(error));
      } else {
        job.resolve(
          Buffer.from(result.buffer, result.byteOffset, result.byteLength)
        );
      }
      waiting.shift()?.();
    });

    worker.on("error", (error) => retire(worker, error));
    worker.on("exit", () =>
      retire(worker, new Error("zopfli worker exited unexpectedly"))
    );

    return worker;
  };

  return (contents) =>
    new Promise((resolve, reject) => {
      const start = () => {
        const worker = idle.pop() ?? (live.size < size ? spawn() : undefined);
        if (!worker) {
          waiting.push(start);
          return;
        }
        inFlight.set(worker, { resolve, reject });
        worker.ref();
        // `contents` is cloned rather than transferred: buffers read by vinyl
        // can share a pooled ArrayBuffer with unrelated buffers, and
        // transferring would detach those too.
        worker.postMessage({ contents, options: ZOPFLI_OPTIONS });
      };
      start();
    });
};

// Shared by every transform this module hands out, so the worker count is a
// property of the process rather than of how many streams happen to run.
let pool;

const sharedPool = () => {
  if (!pool) {
    const size = poolSize();
    pool = { size, compress: createPool(size) };
  }
  return pool;
};

/**
 * @param {object} [options]
 * @param {number} [options.threshold] Skip files smaller than this many bytes.
 */
export default ({ threshold = 0 } = {}) => {
  const { size, compress } = sharedPool();

  return new ParallelTransform(size, async (file) => {
    if (file.isNull()) {
      return file;
    }
    if (file.isStream()) {
      file.contents = await readStream(file.contents);
    }
    if (threshold && file.contents.length < threshold) {
      // Passed through unrenamed and uncompressed, as gulp-zopfli-green did.
      return file;
    }
    file.contents = await withCache(NAMESPACE, file.contents, () =>
      compress(file.contents)
    );
    file.path += EXTENSION;
    return file;
  });
};
