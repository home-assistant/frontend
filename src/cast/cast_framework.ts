import { loadJS } from "../common/dom/load_resource";

let loadedPromise: Promise<boolean> | undefined;

export const castApiAvailable = () => {
  if (loadedPromise) {
    return loadedPromise;
  }

  loadedPromise = new Promise((resolve) => {
    (window as any).__onGCastApiAvailable = resolve;
  });
  // Any element with a specific ID will get set as a JS variable on window
  // This will override the cast SDK if the iconset is loaded afterwards.
  // Conflicting IDs will no longer mess with window, so we'll just append one.
  const el = document.createElement("div");
  el.id = "cast";
  document.body.append(el);

  loadJS(
    "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
  );
  return loadedPromise;
};
