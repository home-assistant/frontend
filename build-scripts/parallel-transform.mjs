// Object-mode transform that keeps several files in flight at once.
//
// through2 and node's Transform both wait for the previous callback before
// handling the next file, which serialises asynchronous work down to one file
// at a time. This keeps `limit` files in flight and applies backpressure beyond
// that. Files are emitted in completion order rather than input order.

import { Transform } from "node:stream";

export class ParallelTransform extends Transform {
  #limit;

  #handle;

  #inFlight = 0;

  #resume;

  #finish;

  constructor(limit, handle) {
    super({ objectMode: true, highWaterMark: limit });
    this.#limit = limit;
    this.#handle = handle;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention -- node's Transform API
  _transform(file, _encoding, callback) {
    this.#inFlight += 1;
    this.#handle(file)
      .then((result) => {
        if (result) {
          this.push(result);
        }
      })
      .catch((error) => this.destroy(error))
      .finally(() => {
        this.#inFlight -= 1;
        const resume = this.#resume;
        this.#resume = undefined;
        resume?.();
        if (this.#inFlight === 0) {
          const finish = this.#finish;
          this.#finish = undefined;
          finish?.();
        }
      });

    if (this.#inFlight < this.#limit) {
      callback();
    } else {
      this.#resume = callback;
    }
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention -- node's Transform API
  _flush(callback) {
    if (this.#inFlight === 0) {
      callback();
    } else {
      this.#finish = callback;
    }
  }
}
