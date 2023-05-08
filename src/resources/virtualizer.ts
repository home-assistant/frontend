import { loadPolyfillIfNeeded } from "./resize-observer.polyfill";

export const loadVirtualizer = async () => {
  await loadPolyfillIfNeeded();
  await import("@lit-labs/virtualizer");
};
