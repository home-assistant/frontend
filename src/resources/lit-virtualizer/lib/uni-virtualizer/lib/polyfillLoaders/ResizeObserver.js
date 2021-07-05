let _RO;
let RO;
export default async function ResizeObserver() {
  return RO || init();
}
async function init() {
  if (_RO) {
    return (await _RO).default;
  } else {
    _RO = window.ResizeObserver;
    try {
      new _RO(function () {});
    } catch (e) {
      _RO = import("../polyfills/resize-observer-polyfill/ResizeObserver.js");
      _RO = (await _RO).default;
    }
    return (RO = _RO);
  }
}
//# sourceMappingURL=ResizeObserver.js.map
