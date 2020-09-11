export const throttle = (callback: Function, wait: number) => {
  let isCalled = false;

  return function (...args: any) {
    if (!isCalled) {
      callback(...args);
      isCalled = true;
      setTimeout(() => {
        isCalled = false;
      }, wait);
    }
  };
};

export const throttleAndQueue = (
  callback: Function,
  wait: number,
  delay?: number
) => {
  let isCalled = false;
  let timer: number | undefined;
  let delaying = false;

  const processQueue = () => {
    if (isCalled) {
      callback();
    }
    clearInterval(timer);
    timer = undefined;
    isCalled = false;
  };

  const setUpThrottle = () => {
    delaying = false;

    processQueue(); // start immediately on the first invocation
    timer = window.setInterval(processQueue, wait);
  };

  return () => {
    isCalled = true;
    if (timer !== undefined) {
      return;
    }

    if (delay === undefined) {
      setUpThrottle();
    } else if (!delaying) {
      delaying = true;
      setTimeout(setUpThrottle, delay);
    }
  };
};
