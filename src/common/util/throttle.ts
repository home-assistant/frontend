// From: underscore.js https://github.com/jashkenas/underscore/blob/master/underscore.js

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `false for leading`. To disable execution on the trailing edge, ditto.
// The trailing call uses the arguments of the latest call.
export const throttle = <T extends any[]>(
  func: (...args: T) => void,
  wait: number,
  leading = true,
  trailing = true
) => {
  let timeout: number | undefined;
  let previous = 0;
  let pendingArgs: T | undefined;
  const later = () => {
    previous = leading === false ? 0 : Date.now();
    timeout = undefined;
    const args = pendingArgs;
    pendingArgs = undefined;
    if (args) {
      func(...args);
    }
  };
  const throttledFunc = (...args: T): void => {
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
      pendingArgs = undefined;
      func(...args);
    } else if (trailing !== false) {
      pendingArgs = args;
      if (!timeout) {
        timeout = window.setTimeout(later, remaining);
      }
    }
  };
  throttledFunc.cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
    previous = 0;
    pendingArgs = undefined;
  };
  return throttledFunc;
};
