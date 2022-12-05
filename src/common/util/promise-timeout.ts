export const promiseTimeout = (ms: number, promise: Promise<any> | any) => {
  const timeout = new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(`Timed out in ${ms} ms.`);
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
};
