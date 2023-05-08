export const loadPolyfillIfNeeded = async () => {
  try {
    // eslint-disable-next-line no-new
    new ResizeObserver(() => {});
    return;
  } catch (e) {
    window.ResizeObserver = (
      await import(
        "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver.js"
      )
    ).default;
  }
};
