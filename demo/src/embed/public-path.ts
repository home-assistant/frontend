/* eslint-disable @typescript-eslint/naming-convention */
declare global {
  var __HA_STATIC_PATH__: string | undefined;
}
declare let __webpack_public_path__: string;
/* eslint-enable @typescript-eslint/naming-convention */

// Load chunks and static files from the server that hosts this script, so
// that other sites can embed the cards. Only the modern production build keeps
// `import.meta.url` (see build-scripts/rspack.cjs). The legacy and development
// builds only run on the demo site, where the default paths are correct.
// `new URL(path, import.meta.url)` in one expression is an asset reference for
// the bundler, so the script URL goes into a variable first.
if (__BUILD__ === "modern" && !__DEV__) {
  const scriptUrl = import.meta.url;
  __webpack_public_path__ = new URL(".", scriptUrl).href;
  globalThis.__HA_STATIC_PATH__ = new URL("../static/", scriptUrl).href;
}

export {};
