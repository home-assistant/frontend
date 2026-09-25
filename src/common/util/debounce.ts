// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge. The trailing edge only fires if there were additional calls
// during the wait period.

export const debounce = <T extends any[]>(
  func: (...args: T) => void,
  wait: number,
  immediate = false
) => {
  let timeout: number | undefined;
  let trailingArgs: T | undefined;

  const debouncedFunc = (...args: T): void => {
    const isLeading = immediate && !timeout;

    if (timeout) {
      trailingArgs = args;
    }
    clearTimeout(timeout);

    timeout = window.setTimeout(() => {
      timeout = undefined;
      if (trailingArgs) {
        func(...trailingArgs);
        trailingArgs = undefined;
      } else if (!immediate) {
        func(...args);
      }
    }, wait);

    if (isLeading) {
      func(...args);
    }
  };

  debouncedFunc.cancel = () => {
    clearTimeout(timeout);
    trailingArgs = undefined;
  };

  return debouncedFunc;
};
