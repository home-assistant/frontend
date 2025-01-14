class TimeoutError extends Error {
  public timeout: number;

  constructor(timeout: number, ...params) {
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }

    this.name = "TimeoutError";
    // Custom debugging information
    this.timeout = timeout;
    this.message = `Timed out in ${timeout} ms.`;
  }
}

export const promiseTimeout = (ms: number, promise: Promise<any> | any) => {
  const timeout = new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(ms));
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
};
