import { Buffer } from "node:buffer";
import { Readable } from "node:stream";

// Stand-in for the vinyl files gulp.src yields in buffer mode.
export const file = (path, contents) => ({
  path,
  contents,
  isNull() {
    return this.contents === null;
  },
  isStream() {
    return this.contents instanceof Readable;
  },
});

export const filler = (length) => Buffer.alloc(length, "a");

export const run = (stream, files) =>
  new Promise((resolve, reject) => {
    const out = [];
    stream.on("data", (result) => out.push(result));
    stream.on("error", reject);
    stream.on("end", () => resolve(out));
    files.forEach((entry) => stream.write(entry));
    stream.end();
  });
