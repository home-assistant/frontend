export const installResizeObserver = async () => {
  if (typeof ResizeObserver !== "function") {
    const modules = await import("resize-observer-polyfill");
    window.ResizeObserver = modules.default;
  }
};
