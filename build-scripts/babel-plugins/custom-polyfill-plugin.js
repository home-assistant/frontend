import defineProvider from "@babel/helper-define-polyfill-provider";

// List of polyfill keys with supported browser targets for the functionality
const PolyfillSupport = {
  fetch: {
    android: 42,
    chrome: 42,
    edge: 14,
    firefox: 39,
    ios: 10.3,
    opera: 29,
    opera_mobile: 29,
    safari: 10.1,
    samsung: 4.0,
  },
  proxy: {
    android: 49,
    chrome: 49,
    edge: 12,
    firefox: 18,
    ios: 10.0,
    opera: 36,
    opera_mobile: 36,
    safari: 10.0,
    samsung: 5.0,
  },
};

// Map of global variables and/or instance and static properties to the
// corresponding polyfill key and actual module to import
const polyfillMap = {
  global: {
    Proxy: { key: "proxy", module: "proxy-polyfill" },
    fetch: { key: "fetch", module: "unfetch/polyfill" },
  },
  instance: {},
  static: {},
};

// Create plugin using the same factory as for CoreJS
export default defineProvider(
  ({ createMetaResolver, debug, shouldInjectPolyfill }) => {
    const resolvePolyfill = createMetaResolver(polyfillMap);
    return {
      name: "HA Custom",
      polyfills: PolyfillSupport,
      usageGlobal(meta, utils) {
        const polyfill = resolvePolyfill(meta);
        if (polyfill && shouldInjectPolyfill(polyfill.desc.key)) {
          debug(polyfill.desc.key);
          utils.injectGlobalImport(polyfill.desc.module);
        }
      },
    };
  }
);
