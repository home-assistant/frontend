export const installResizeObserver = async () => {
  if (typeof ResizeObserver !== "function") {
    window.ResizeObserver = (await import("resize-observer-polyfill")).default;
  }
};
