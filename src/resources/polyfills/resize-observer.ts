if (typeof window.ResizeObserver !== "function") {
  window.ResizeObserver = (
    await import(
      "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver"
    )
  ).default;
}

export {};
