// From: underscore.js https://github.com/jashkenas/underscore/blob/master/underscore.js

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `false for leading`. To disable execution on the trailing edge, ditto.
export const throttle = <T extends any[]>(
  func: (...args: T) => void,
  wait: number,
  leading = true,
  trailing = true
) => {
  let timeout: number | undefined;
  let previous = 0;
  const throttledFunc = (...args: T): void => {
    const later = () => {
      previous = leading === false ? 0 : Date.now();
      timeout = undefined;
      func(...args);
    };
    const now = Date.now();
    if (!previous && leading === false) {
      previous = now;
    }
    const remaining = wait - (now - previous);
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      previous = now;
      func(...args);
    } else if (!timeout && trailing !== false) {
      timeout = window.setTimeout(later, remaining);
    }
  };
  throttledFunc.cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
    previous = 0;
  };
  return throttledFunc;
};
