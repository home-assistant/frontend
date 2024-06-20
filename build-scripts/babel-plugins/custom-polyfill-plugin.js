import defineProvider from "@babel/helper-define-polyfill-provider";
import { join } from "node:path";
import paths from "../paths.cjs";

const POLYFILL_DIR = join(paths.polymer_dir, "src/resources/polyfills");

// List of polyfill keys with supported browser targets for the functionality
const PolyfillSupport = {
  // Note states and shadowRoot properties should be supported.
  "element-internals": {
    android: 90,
    chrome: 90,
    edge: 90,
    firefox: 126,
    ios: 17.4,
    opera: 76,
    opera_mobile: 64,
    safari: 17.4,
    samsung: 15.0,
  },
  "element-append": {
    android: 54,
    chrome: 54,
    edge: 17,
    firefox: 49,
    ios: 10.0,
    opera: 41,
    opera_mobile: 41,
    safari: 10.0,
    samsung: 6.0,
  },
  "element-getattributenames": {
    android: 61,
    chrome: 61,
    edge: 18,
    firefox: 45,
    ios: 10.3,
    opera: 48,
    opera_mobile: 45,
    safari: 10.1,
    samsung: 8.0,
  },
  "element-toggleattribute": {
    android: 69,
    chrome: 69,
    edge: 18,
    firefox: 63,
    ios: 12.0,
    opera: 56,
    opera_mobile: 48,
    safari: 12.0,
    samsung: 10.0,
  },
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
  "intl-getcanonicallocales": {
    android: 54,
    chrome: 54,
    edge: 16,
    firefox: 48,
    ios: 10.3,
    opera: 41,
    opera_mobile: 41,
    safari: 10.1,
    samsung: 6.0,
  },
  "intl-locale": {
    android: 74,
    chrome: 74,
    edge: 79,
    firefox: 75,
    ios: 14.0,
    opera: 62,
    opera_mobile: 53,
    safari: 14.0,
    samsung: 11.0,
  },
  "intl-other": {
    // Not specified (i.e. always try polyfill) since compatibility depends on supported locales
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
  "resize-observer": {
    android: 64,
    chrome: 64,
    edge: 79,
    firefox: 69,
    ios: 13.4,
    opera: 51,
    opera_mobile: 47,
    safari: 13.1,
    samsung: 9.0,
  },
};

// Map of global variables and/or instance and static properties to the
// corresponding polyfill key and actual module to import
const polyfillMap = {
  global: {
    fetch: { key: "fetch", module: "unfetch/polyfill" },
    Proxy: { key: "proxy", module: "proxy-polyfill" },
    ResizeObserver: {
      key: "resize-observer",
      module: join(POLYFILL_DIR, "resize-observer.ts"),
    },
  },
  instance: {
    attachInternals: {
      key: "element-internals",
      module: "element-internals-polyfill",
    },
    ...Object.fromEntries(
      ["append", "getAttributeNames", "toggleAttribute"].map((prop) => {
        const key = `element-${prop.toLowerCase()}`;
        return [prop, { key, module: join(POLYFILL_DIR, `${key}.ts`) }];
      })
    ),
  },
  static: {
    Intl: {
      getCanonicalLocales: {
        key: "intl-getcanonicallocales",
        module: join(POLYFILL_DIR, "intl-polyfill.ts"),
      },
      Locale: {
        key: "intl-locale",
        module: join(POLYFILL_DIR, "intl-polyfill.ts"),
      },
      ...Object.fromEntries(
        [
          "DateTimeFormat",
          "DisplayNames",
          "ListFormat",
          "NumberFormat",
          "PluralRules",
          "RelativeTimeFormat",
        ].map((obj) => [
          obj,
          { key: "intl-other", module: join(POLYFILL_DIR, "intl-polyfill.ts") },
        ])
      ),
    },
  },
};

// Create plugin using the same factory as for CoreJS
export default defineProvider(
  ({ createMetaResolver, debug, shouldInjectPolyfill }) => {
    const resolvePolyfill = createMetaResolver(polyfillMap);
    return {
      name: "custom-polyfill",
      polyfills: PolyfillSupport,
      usageGlobal(meta, utils) {
        const polyfill = resolvePolyfill(meta);
        if (polyfill && shouldInjectPolyfill(polyfill.desc.key)) {
          debug(polyfill.desc.key);
          utils.injectGlobalImport(polyfill.desc.module);
          return true;
        }
        return false;
      },
    };
  }
);
