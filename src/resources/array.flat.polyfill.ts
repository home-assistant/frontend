/* eslint-disable no-extend-native */

export {}; // for Babel to treat as a module

if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, "flat", {
    configurable: true,
    writable: true,
    value: function (...args) {
      const depth = typeof args[0] === "undefined" ? 1 : Number(args[0]) || 0;
      const result = [];
      const forEach = result.forEach;

      const flatDeep = (arr: Array<any>, dpth: number) => {
        forEach.call(arr, (val) => {
          if (dpth > 0 && Array.isArray(val)) {
            flatDeep(val, dpth - 1);
          } else {
            result.push(val);
          }
        });
      };

      flatDeep(this, depth);
      return result;
    },
  });
}
