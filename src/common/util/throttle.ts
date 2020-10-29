// From: underscore.js https://github.com/jashkenas/underscore/blob/master/underscore.js

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `false for leading`. To disable execution on the trailing edge, ditto.
export const throttle = <T extends (...args) => unknown>(
  func: T,
  wait: number,
  leading = true,
  trailing = true
): T => {
  let timeout: number | undefined;
  let previous = 0;
  let context: any;
  let args: any;
  const later = () => {
    previous = leading === false ? 0 : Date.now();
    timeout = undefined;
    func.apply(context, args);
    if (!timeout) {
      context = null;
      args = null;
    }
  };
  // @ts-ignore
  return function (...argmnts) {
    // @ts-ignore
    // @typescript-eslint/no-this-alias
    context = this;
    args = argmnts;

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
      func.apply(context, args);
    } else if (!timeout && trailing !== false) {
      timeout = window.setTimeout(later, remaining);
    }
  };
};
