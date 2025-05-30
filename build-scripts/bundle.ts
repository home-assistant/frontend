import path from "node:path";
import packageJson from "../package.json" assert { type: "json" };
import { version } from "./env.ts";
import paths, { dirname } from "./paths.ts";

const dependencies = packageJson.dependencies;

const BABEL_PLUGINS = path.join(dirname, "babel-plugins");

// GitHub base URL to use for production source maps
// Nightly builds use the commit SHA, otherwise assumes there is a tag that matches the version
export const sourceMapURL = () => {
  const ref = version().endsWith("dev")
    ? process.env.GITHUB_SHA || "dev"
    : version();
  return `https://raw.githubusercontent.com/home-assistant/frontend/${ref}/`;
};

// Files from NPM packages that we should replace with empty file
export const emptyPackages = ({ isHassioBuild }) =>
  [
    import.meta.resolve("@vaadin/vaadin-material-styles/typography.js"),
    import.meta.resolve("@vaadin/vaadin-material-styles/font-icons.js"),
    // Icons in supervisor conflict with icons in HA so we don't load.
    isHassioBuild &&
      import.meta.resolve(
        path.resolve(paths.root_dir, "src/components/ha-icon.ts")
      ),
    isHassioBuild &&
      import.meta.resolve(
        path.resolve(paths.root_dir, "src/components/ha-icon-picker.ts")
      ),
  ].filter(Boolean);

export const definedVars = ({ isProdBuild, latestBuild, defineOverlay }) => ({
  __DEV__: !isProdBuild,
  __BUILD__: JSON.stringify(latestBuild ? "modern" : "legacy"),
  __VERSION__: JSON.stringify(version()),
  __DEMO__: false,
  __SUPERVISOR__: false,
  __BACKWARDS_COMPAT__: false,
  __STATIC_PATH__: "/static/",
  __HASS_URL__: `\`${
    "HASS_URL" in process.env
      ? process.env.HASS_URL
      : // eslint-disable-next-line no-template-curly-in-string
        "${location.protocol}//${location.host}"
  }\``,
  "process.env.NODE_ENV": JSON.stringify(
    isProdBuild ? "production" : "development"
  ),
  ...defineOverlay,
});

export const htmlMinifierOptions = {
  caseSensitive: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  decodeEntities: true,
  removeComments: true,
  removeRedundantAttributes: true,
  minifyCSS: {
    compatibility: "*,-properties.zeroUnits",
  },
};

export const terserOptions = ({ latestBuild, isTestBuild }) => ({
  safari10: !latestBuild,
  ecma: latestBuild ? (2015 as const) : (5 as const),
  module: latestBuild,
  format: { comments: false },
  sourceMap: !isTestBuild,
});

/** @type {import('@rspack/core').SwcLoaderOptions} */
export const swcOptions = () => ({
  jsc: {
    loose: true,
    externalHelpers: true,
    target: "ES2021",
    parser: {
      syntax: "typescript",
      decorators: true,
    },
  },
});

export const babelOptions = ({
  latestBuild,
  isProdBuild,
  isTestBuild,
  sw,
}: {
  latestBuild?: boolean;
  isProdBuild?: boolean;
  isTestBuild?: boolean;
  sw?: boolean;
}) => ({
  babelrc: false,
  compact: false,
  assumptions: {
    privateFieldsAsProperties: true,
    setPublicClassFields: true,
    setSpreadProperties: true,
  },
  browserslistEnv: latestBuild ? "modern" : `legacy${sw ? "-sw" : ""}`,
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: dependencies["core-js"],
        bugfixes: true,
        shippedProposals: true,
      },
    ],
  ],
  plugins: [
    [
      path.join(BABEL_PLUGINS, "inline-constants-plugin.cjs"),
      {
        modules: ["@mdi/js"],
        ignoreModuleNotFound: true,
      },
    ],
    // Minify template literals for production
    isProdBuild && [
      "template-html-minifier",
      {
        modules: {
          ...Object.fromEntries(
            ["lit", "lit-element", "lit-html"].map((m) => [
              m,
              [
                "html",
                { name: "svg", encapsulation: "svg" },
                { name: "css", encapsulation: "style" },
              ],
            ])
          ),
          "@polymer/polymer/lib/utils/html-tag.js": ["html"],
        },
        strictCSS: true,
        htmlMinifier: htmlMinifierOptions,
        failOnError: false, // we can turn this off in case of false positives
      },
    ],
    // Import helpers and regenerator from runtime package
    [
      "@babel/plugin-transform-runtime",
      { version: dependencies["@babel/runtime"] },
    ],
    "@babel/plugin-transform-class-properties",
    "@babel/plugin-transform-private-methods",
  ].filter(Boolean),
  exclude: [
    // \\ for Windows, / for Mac OS and Linux
    /node_modules[\\/]core-js/,
  ],
  sourceMaps: !isTestBuild,
  overrides: [
    {
      // Add plugin to inject various polyfills, excluding the polyfills
      // themselves to prevent self-injection.
      plugins: [
        [
          path.join(BABEL_PLUGINS, "custom-polyfill-plugin.ts"),
          { method: "usage-global" },
        ],
      ],
      exclude: [
        path.join(paths.root_dir, "src/resources/polyfills"),
        ...[
          "@formatjs/(?:ecma402-abstract|intl-\\w+)",
          "@lit-labs/virtualizer/polyfills",
          "@webcomponents/scoped-custom-element-registry",
          "element-internals-polyfill",
          "proxy-polyfill",
          "unfetch",
        ].map((p) => new RegExp(`/node_modules/${p}/`)),
      ],
    },
    {
      // Use unambiguous for dependencies so that require() is correctly injected into CommonJS files
      // Exclusions are needed in some cases where ES modules have no static imports or exports, such as polyfills
      sourceType: "unambiguous",
      include: /\/node_modules\//,
      exclude: [
        "element-internals-polyfill",
        "@shoelace-style",
        "@?lit(?:-labs|-element|-html)?",
      ].map((p) => new RegExp(`/node_modules/${p}/`)),
    },
  ],
});

const nameSuffix = (latestBuild) => (latestBuild ? "-modern" : "-legacy");

const outputPath = (outputRoot, latestBuild) =>
  path.resolve(outputRoot, latestBuild ? "frontend_latest" : "frontend_es5");

const publicPath = (latestBuild, root = "") =>
  latestBuild ? `${root}/frontend_latest/` : `${root}/frontend_es5/`;

/*
  BundleConfig {
    // Object with entrypoints that need to be bundled
    entry: { [name: string]: pathToFile },
    // Folder where bundled files need to be written
    outputPath: string,
    // absolute url-path where bundled files can be found
    publicPath: string,
    // extra definitions that we need to replace in source
    defineOverlay: {[name: string]: value },
    // if this is a production build
    isProdBuild: boolean,
    // If we're targeting latest browsers
    latestBuild: boolean,
    // If we're doing a stats build (create nice chunk names)
    isStatsBuild: boolean,
    // If it's just a test build in CI, skip time on source map generation
    isTestBuild: boolean,
    // Names of entrypoints that should not be hashed
    dontHash: Set<string>
  }
  */

export const config = {
  app({
    isProdBuild,
    latestBuild,
    isStatsBuild,
    isTestBuild,
    isWDS,
  }: {
    isProdBuild?: boolean;
    latestBuild?: boolean;
    isStatsBuild?: boolean;
    isTestBuild?: boolean;
    isWDS?: boolean;
  }) {
    return {
      name: "frontend" + nameSuffix(latestBuild),
      entry: {
        "service-worker": !latestBuild
          ? {
              import: "./src/entrypoints/service-worker.ts",
              layer: "sw",
            }
          : "./src/entrypoints/service-worker.ts",
        app: "./src/entrypoints/app.ts",
        authorize: "./src/entrypoints/authorize.ts",
        onboarding: "./src/entrypoints/onboarding.ts",
        core: "./src/entrypoints/core.ts",
        "custom-panel": "./src/entrypoints/custom-panel.ts",
      },
      outputPath: outputPath(paths.app_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isTestBuild,
      isWDS,
    };
  },

  demo({ isProdBuild, latestBuild, isStatsBuild }) {
    return {
      name: "demo" + nameSuffix(latestBuild),
      entry: {
        main: path.resolve(paths.demo_dir, "src/entrypoint.ts"),
      },
      outputPath: outputPath(paths.demo_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      defineOverlay: {
        __VERSION__: JSON.stringify(`DEMO-${version()}`),
        __DEMO__: true,
      },
      isProdBuild,
      latestBuild,
      isStatsBuild,
    };
  },

  cast({ isProdBuild, latestBuild }) {
    const entry: Record<string, string> = {
      launcher: path.resolve(paths.cast_dir, "src/launcher/entrypoint.ts"),
      media: path.resolve(paths.cast_dir, "src/media/entrypoint.ts"),
    };

    if (latestBuild) {
      entry.receiver = path.resolve(
        paths.cast_dir,
        "src/receiver/entrypoint.ts"
      );
    }

    return {
      name: "cast" + nameSuffix(latestBuild),
      entry,
      outputPath: outputPath(paths.cast_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
      defineOverlay: {
        __BACKWARDS_COMPAT__: true,
      },
    };
  },

  hassio({ isProdBuild, latestBuild, isStatsBuild, isTestBuild }) {
    return {
      name: "supervisor" + nameSuffix(latestBuild),
      entry: {
        entrypoint: path.resolve(paths.hassio_dir, "src/entrypoint.ts"),
      },
      outputPath: outputPath(paths.hassio_output_root, latestBuild),
      publicPath: publicPath(latestBuild, paths.hassio_publicPath),
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isTestBuild,
      isHassioBuild: true,
      defineOverlay: {
        __SUPERVISOR__: true,
        __STATIC_PATH__: `"${paths.hassio_publicPath}/static/"`,
      },
    };
  },

  gallery({ isProdBuild, latestBuild }) {
    return {
      name: "gallery" + nameSuffix(latestBuild),
      entry: {
        entrypoint: path.resolve(paths.gallery_dir, "src/entrypoint.js"),
      },
      outputPath: outputPath(paths.gallery_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
      defineOverlay: {
        __DEMO__: true,
      },
    };
  },

  landingPage({ isProdBuild, latestBuild }) {
    return {
      name: "landing-page" + nameSuffix(latestBuild),
      entry: {
        entrypoint: path.resolve(paths.landingPage_dir, "src/entrypoint.js"),
      },
      outputPath: outputPath(paths.landingPage_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
    };
  },
};
