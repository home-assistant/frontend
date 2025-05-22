export const waitForMs = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitForSeconds = (seconds: number) => waitForMs(seconds * 1000);
