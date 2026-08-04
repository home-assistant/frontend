// Worker side of the zopfli pool. @gfx/zopfli is a synchronous WASM build, so
// compressing on the main thread blocks the event loop; one instance per worker
// is what makes the work parallel.

import { parentPort } from "node:worker_threads";
import zopfli from "@gfx/zopfli";

parentPort.on("message", ({ contents, options }) => {
  zopfli.gzip(contents, options, (error, result) => {
    if (error) {
      parentPort.postMessage({ error: error.message ?? String(error) });
      return;
    }
    // `result` is a fresh Uint8Array copied out of the WASM heap, so it owns
    // its ArrayBuffer and can be transferred instead of cloned.
    parentPort.postMessage({ result }, [result.buffer]);
  });
});
