const fs = require("fs");

const { existsSync } = fs;
const path = require("path");
const rspack = require("@rspack/core");
// eslint-disable-next-line @typescript-eslint/naming-convention
const { RsdoctorRspackPlugin } = require("@rsdoctor/rspack-plugin");
// eslint-disable-next-line @typescript-eslint/naming-convention
const { StatsWriterPlugin } = require("webpack-stats-plugin");
const filterStats = require("@bundle-stats/plugin-webpack-filter");
// eslint-disable-next-line @typescript-eslint/naming-convention
const TerserPlugin = require("terser-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/naming-convention
const { WebpackManifestPlugin } = require("rspack-manifest-plugin");
const log = require("fancy-log");
// eslint-disable-next-line @typescript-eslint/naming-convention
const SafeWebpackBar = require("./safe-webpackbar.cjs");
const paths = require("./paths.cjs");
const bundle = require("./bundle.cjs");

// Build-toolchain packages whose version changes the emitted bytes but which
// are loader/compiler machinery, not modules in the build graph — so rspack's
// node_modules snapshot cannot see them. Their versions are folded into the
// persistent cache `version` so a toolchain upgrade invalidates the cache,
// while ordinary runtime-dependency bumps (handled by the snapshot) do not.
const TOOLCHAIN_PACKAGES = [
  "@rspack/core",
  "@babel/core",
  "@babel/preset-env",
  "babel-plugin-polyfill-corejs3",
  "@babel/plugin-transform-runtime",
  "@babel/plugin-transform-class-properties",
  "@babel/plugin-transform-private-methods",
  "@babel/runtime",
  "babel-loader",
  "core-js",
  "terser",
  "terser-webpack-plugin",
  "browserslist",
  "caniuse-lite",
];

// Our own build logic — the config, loaders and babel plugins. Their contents
// (not their paths) go into the cache version, so a change invalidates the
// cache the same way `buildDependencies` would, but without tying validity to
// absolute paths — rspack compares buildDependencies by path, which breaks a
// cache reused on another machine/checkout (a different workspace path).
const CONFIG_FILES = [
  __filename,
  path.join(__dirname, "bundle.cjs"),
  path.join(__dirname, "minify-template-literals-loader.cjs"),
  path.join(__dirname, "lit-disable-dev-mode-loader.cjs"),
  path.join(__dirname, "babel-plugins", "custom-polyfill-plugin.js"),
  path.join(__dirname, "babel-plugins", "inline-constants-plugin.cjs"),
];

// Content hash of the toolchain versions and our own build files, used as the
// persistent cache `version`. Everything here is path-independent so the cache
// stays valid when reused on a different machine or checkout path.
const cacheVersion = () => {
  const parts = [
    ...TOOLCHAIN_PACKAGES.map(
      (pkg) => `${pkg}@${require(`${pkg}/package.json`).version}`
    ),
    ...CONFIG_FILES.map(
      (file) => `${path.basename(file)}:${fs.readFileSync(file, "utf8")}`
    ),
  ];
  return require("crypto")
    .createHash("sha256")
    .update(parts.join("\n"))
    .digest("hex")
    .slice(0, 16);
};

class LogStartCompilePlugin {
  ignoredFirst = false;

  apply(compiler) {
    compiler.hooks.beforeCompile.tap("LogStartCompilePlugin", () => {
      if (!this.ignoredFirst) {
        this.ignoredFirst = true;
        return;
      }
      log("Changes detected. Starting compilation");
    });
  }
}

const createRspackConfig = ({
  name,
  entry,
  outputPath,
  publicPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
  isLandingPageBuild,
  dontHash,
}) => {
  if (!dontHash) {
    dontHash = new Set();
  }
  const ignorePackages = bundle.ignorePackages({ latestBuild });
  const litHtmlRoot = path.resolve(__dirname, "../node_modules/lit-html");
  const litHtmlDevelopmentRoot = path.join(litHtmlRoot, "development");
  const litDisableDevModeLoader = path.join(
    __dirname,
    "lit-disable-dev-mode-loader.cjs"
  );
  return {
    name,
    mode: isProdBuild ? "production" : "development",
    target: `browserslist:${latestBuild ? "modern" : "legacy"}`,
    // For tests/CI, source maps are skipped to gain build speed
    // For production, generate source maps for accurate stack traces without source code
    // For development, generate "cheap" versions that can map to original line numbers
    devtool: isTestBuild
      ? false
      : isProdBuild
        ? "nosources-source-map"
        : "eval-cheap-module-source-map",
    entry,
    node: false,
    module: {
      rules: [
        {
          test: /\.m?js$|\.ts$/,
          exclude: /node_modules[\\/]core-js/,
          use: (info) =>
            [
              {
                loader: "babel-loader",
                options: {
                  ...bundle.babelOptions({
                    latestBuild,
                    isTestBuild,
                    sw: info.issuerLayer === "sw",
                  }),
                  cacheDirectory: !isProdBuild,
                  cacheCompression: false,
                },
              },
              // Minify lit html/svg/css tagged template literals for production.
              // Must run after swc (TS/decorators stripped, but templates kept at
              // ES2021) and before babel — otherwise the legacy build lowers
              // html`` to _taggedTemplateLiteral() calls that can no longer be
              // matched, leaving legacy templates unminified.
              isProdBuild && {
                loader: path.join(
                  __dirname,
                  "minify-template-literals-loader.cjs"
                ),
                options: {
                  browserslistEnv: latestBuild
                    ? "modern"
                    : `legacy${info.issuerLayer === "sw" ? "-sw" : ""}`,
                },
              },
              !latestBuild &&
                info.resource.startsWith(
                  `${litHtmlDevelopmentRoot}${path.sep}`
                ) && {
                  loader: litDisableDevModeLoader,
                },
              {
                loader: "builtin:swc-loader",
                options: bundle.swcOptions(),
              },
            ].filter(Boolean),
          resolve: {
            fullySpecified: false,
          },
          parser: {
            worker: ["*context.audioWorklet.addModule()", "..."],
          },
        },
        {
          test: /\.css$/,
          type: "asset/source",
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          extractComments: true,
          terserOptions: bundle.terserOptions({ latestBuild, isTestBuild }),
        }),
      ],
      moduleIds: isProdBuild && !isStatsBuild ? "deterministic" : "named",
      chunkIds: isProdBuild && !isStatsBuild ? "deterministic" : "named",
      splitChunks: {
        // Disable splitting for web workers and worklets because imports of
        // external chunks are broken for:
        chunks: !isProdBuild
          ? // improve incremental build speed, but blows up bundle size
            new RegExp(
              `^(?!(${Object.keys(entry).join("|")}|.*work(?:er|let))$)`
            )
          : // - ESM output: https://github.com/webpack/webpack/issues/17014
            // - Worklets use `importScripts`: https://github.com/webpack/webpack/issues/11543
            (chunk) =>
              !chunk.canBeInitial() &&
              !new RegExp(
                `^.+-work${latestBuild ? "(?:let|er)" : "let"}$`
              ).test(chunk.name),
      },
    },
    plugins: [
      !isStatsBuild && new SafeWebpackBar({ fancy: !isProdBuild }),
      new WebpackManifestPlugin({
        // Only include the JS of entrypoints
        filter: (file) => file.isInitial && !file.name.endsWith(".map"),
      }),
      // Babel can miscompile Lit's pre-minified runtime when downleveling to
      // ES5. Compile lit-html from its development sources for legacy builds,
      // then let the normal production minifier handle the final bundle.
      !latestBuild &&
        new rspack.NormalModuleReplacementPlugin(
          /^(?:lit-html(?:\/.*)?|\.{1,2}\/.*\.js)$/,
          (resource) => {
            if (resource.request === "lit-html") {
              resource.request = path.join(
                litHtmlDevelopmentRoot,
                "lit-html.js"
              );
              return;
            }
            if (resource.request.startsWith("lit-html/")) {
              if (resource.request.startsWith("lit-html/development/")) {
                return;
              }
              resource.request = path.join(
                litHtmlDevelopmentRoot,
                resource.request.slice("lit-html/".length)
              );
              return;
            }
            if (
              resource.context.startsWith(`${litHtmlRoot}${path.sep}`) &&
              resource.context !== litHtmlDevelopmentRoot &&
              !resource.context.startsWith(
                `${litHtmlDevelopmentRoot}${path.sep}`
              )
            ) {
              resource.request = path.join(
                litHtmlDevelopmentRoot,
                path.relative(
                  litHtmlRoot,
                  path.resolve(resource.context, resource.request)
                )
              );
            }
          }
        ),
      new rspack.DefinePlugin(
        bundle.definedVars({ isProdBuild, latestBuild, defineOverlay })
      ),
      new rspack.IgnorePlugin({
        checkResource(resource, context) {
          // Only use ignore to intercept imports that we don't control
          // inside node_module dependencies.
          if (
            !context.includes("/node_modules/") ||
            // calling define.amd will call require("!!webpack amd options")
            resource.startsWith("!!webpack") ||
            // loaded by webpack dev server but doesn't exist.
            resource === "webpack/hot" ||
            resource.startsWith("@swc/helpers")
          ) {
            return false;
          }
          let fullPath;
          try {
            fullPath = resource.startsWith(".")
              ? path.resolve(context, resource)
              : require.resolve(resource);
          } catch (err) {
            console.error(
              "Error in Home Assistant ignore plugin",
              resource,
              context
            );
            throw err;
          }

          return ignorePackages.some((toIgnorePath) =>
            fullPath.startsWith(toIgnorePath)
          );
        },
      }),
      bundle.emptyPackages({ isLandingPageBuild }).length
        ? new rspack.NormalModuleReplacementPlugin(
            new RegExp(bundle.emptyPackages({ isLandingPageBuild }).join("|")),
            path.resolve(paths.root_dir, "src/util/empty.js")
          )
        : false,
      // core-js ships a Node-only helper that evaluates
      // `Function('return require("...")')()` when its runtime environment
      // detection mis-classifies the page as Node. That produces a
      // ReferenceError on browsers (observed on Safari 14). Since browser
      // bundles never need to access Node built-in modules, replace it with
      // a CommonJS no-op stub matching the helper's API (returns undefined).
      new rspack.NormalModuleReplacementPlugin(
        /core-js[\\/]internals[\\/]get-built-in-node-module(?:\.js)?$/,
        path.resolve(__dirname, "get-built-in-node-module-shim.cjs")
      ),
      !isProdBuild && new LogStartCompilePlugin(),
      isProdBuild &&
        new StatsWriterPlugin({
          filename: path.relative(
            outputPath,
            path.join(paths.build_dir, "stats", `${name}.json`)
          ),
          stats: { assets: true, chunks: true, modules: true },
          transform: (stats) => JSON.stringify(filterStats(stats)),
        }),
      isProdBuild &&
        isStatsBuild &&
        new RsdoctorRspackPlugin({
          reportDir: path.join(paths.build_dir, "rsdoctor"),
          features: ["plugins", "bundle"],
          supports: {
            generateTileGraph: true,
          },
        }),
    ].filter(Boolean),
    resolve: {
      extensions: [".ts", ".js", ".json"],
      alias: {
        "lit/static-html$": "lit/static-html.js",
        "lit/decorators$": "lit/decorators.js",
        "lit/directive$": "lit/directive.js",
        "lit/directives/until$": "lit/directives/until.js",
        "lit/directives/ref$": "lit/directives/ref.js",
        "lit/directives/class-map$": "lit/directives/class-map.js",
        "lit/directives/style-map$": "lit/directives/style-map.js",
        "lit/directives/if-defined$": "lit/directives/if-defined.js",
        "lit/directives/guard$": "lit/directives/guard.js",
        "lit/directives/cache$": "lit/directives/cache.js",
        "lit/directives/join$": "lit/directives/join.js",
        "lit/directives/repeat$": "lit/directives/repeat.js",
        "lit/directives/live$": "lit/directives/live.js",
        "lit/directives/keyed$": "lit/directives/keyed.js",
        "@lit-labs/virtualizer/layouts/grid":
          "@lit-labs/virtualizer/layouts/grid.js",
        "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver":
          "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver.js",
        "@lit-labs/observers/resize-controller":
          "@lit-labs/observers/resize-controller.js",
        "@formatjs/intl-durationformat/should-polyfill$":
          "@formatjs/intl-durationformat/should-polyfill.js",
        "@formatjs/intl-durationformat/polyfill-force$":
          "@formatjs/intl-durationformat/polyfill-force.js",
        "@formatjs/intl-datetimeformat/should-polyfill":
          "@formatjs/intl-datetimeformat/should-polyfill.js",
        "@formatjs/intl-datetimeformat/polyfill-force":
          "@formatjs/intl-datetimeformat/polyfill-force.js",
        "@formatjs/intl-displaynames/should-polyfill":
          "@formatjs/intl-displaynames/should-polyfill.js",
        "@formatjs/intl-displaynames/polyfill-force":
          "@formatjs/intl-displaynames/polyfill-force.js",
        "@formatjs/intl-getcanonicallocales/should-polyfill":
          "@formatjs/intl-getcanonicallocales/should-polyfill.js",
        "@formatjs/intl-getcanonicallocales/polyfill-force":
          "@formatjs/intl-getcanonicallocales/polyfill-force.js",
        "@formatjs/intl-listformat/should-polyfill":
          "@formatjs/intl-listformat/should-polyfill.js",
        "@formatjs/intl-listformat/polyfill-force":
          "@formatjs/intl-listformat/polyfill-force.js",
        "@formatjs/intl-locale/should-polyfill":
          "@formatjs/intl-locale/should-polyfill.js",
        "@formatjs/intl-locale/polyfill-force":
          "@formatjs/intl-locale/polyfill-force.js",
        "@formatjs/intl-numberformat/should-polyfill":
          "@formatjs/intl-numberformat/should-polyfill.js",
        "@formatjs/intl-numberformat/polyfill-force":
          "@formatjs/intl-numberformat/polyfill-force.js",
        "@formatjs/intl-pluralrules/should-polyfill":
          "@formatjs/intl-pluralrules/should-polyfill.js",
        "@formatjs/intl-pluralrules/polyfill-force":
          "@formatjs/intl-pluralrules/polyfill-force.js",
        "@formatjs/intl-relativetimeformat/should-polyfill":
          "@formatjs/intl-relativetimeformat/should-polyfill.js",
        "@formatjs/intl-relativetimeformat/polyfill-force":
          "@formatjs/intl-relativetimeformat/polyfill-force.js",
      },
    },
    output: {
      module: latestBuild,
      filename: ({ chunk }) =>
        !isProdBuild || isStatsBuild || dontHash.has(chunk.name)
          ? "[name].js"
          : "[name].[contenthash].js",
      chunkFilename:
        isProdBuild && !isStatsBuild ? "[name].[contenthash].js" : "[name].js",
      assetModuleFilename:
        isProdBuild && !isStatsBuild ? "[id].[contenthash][ext]" : "[id][ext]",
      crossOriginLoading: "use-credentials",
      hashFunction: "xxhash64",
      path: outputPath,
      publicPath,
      // To silence warning in worker plugin
      globalObject: "self",
      // Since production source maps don't include sources, we need to point to them elsewhere
      // For dependencies, just provide the path (no source in browser)
      // Otherwise, point to the raw code on GitHub for browser to load
      ...Object.fromEntries(
        ["", "Fallback"].map((v) => [
          `devtool${v}ModuleFilenameTemplate`,
          !isTestBuild && isProdBuild
            ? (info) => {
                if (
                  !path.isAbsolute(info.absoluteResourcePath) ||
                  !existsSync(info.resourcePath) ||
                  info.resourcePath.startsWith("./node_modules")
                ) {
                  // Source URLs are unknown for dependencies, so we use a relative URL with a
                  // non - existent top directory.  This results in a clean source tree in browser
                  // dev tools, and they stay happy getting 404s with valid requests.
                  return `/unknown${path.resolve("/", info.resourcePath)}`;
                }
                return new URL(info.resourcePath, bundle.sourceMapURL()).href;
              }
            : undefined,
        ])
      ),
    },
    // Persistent filesystem cache for production builds, opt-in per environment
    // via RSPACK_CACHE ("readwrite" writes it, "readonly" only reads a warm
    // cache — e.g. CI reusing the nightly-written one). Unset (releases, local,
    // tests) = no cache.
    ...(isProdBuild && process.env.RSPACK_CACHE
      ? {
          cache: {
            type: "persistent",
            // `name` is already unique per variant (frontend-modern/-legacy).
            name,
            // Content-based version (node major + toolchain versions + our own
            // build files). Everything is path-independent, so the cache stays
            // valid when reused on another machine/checkout. Runtime deps are
            // deliberately absent — rspack's node_modules snapshot invalidates
            // their modules per-package, so a single unrelated bump keeps the
            // rest warm. buildDependencies is intentionally not used: rspack
            // compares it by absolute path, which breaks cross-machine reuse.
            version: `node${process.versions.node.split(".")[0]}-${cacheVersion()}`,
            storage: {
              type: "filesystem",
              directory: path.resolve(paths.root_dir, ".rspack-cache"),
            },
            // CI reads the nightly-written cache but must not modify it.
            readonly: process.env.RSPACK_CACHE === "readonly",
          },
        }
      : {}),
    experiments: {
      outputModule: true,
    },
  };
};

const createAppConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}) =>
  createRspackConfig(
    bundle.config.app({ isProdBuild, latestBuild, isStatsBuild, isTestBuild })
  );

const createDemoConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}) =>
  createRspackConfig(
    bundle.config.demo({ isProdBuild, latestBuild, isStatsBuild, isTestBuild })
  );

const createCastConfig = ({ isProdBuild, latestBuild }) =>
  createRspackConfig(bundle.config.cast({ isProdBuild, latestBuild }));

const createGalleryConfig = ({ isProdBuild, latestBuild, isTestBuild }) =>
  createRspackConfig(
    bundle.config.gallery({ isProdBuild, latestBuild, isTestBuild })
  );

const createLandingPageConfig = ({ isProdBuild, latestBuild }) =>
  createRspackConfig(bundle.config.landingPage({ isProdBuild, latestBuild }));

const createE2eTestAppConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}) =>
  createRspackConfig(
    bundle.config.e2eTestApp({
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isTestBuild,
    })
  );

module.exports = {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createGalleryConfig,
  createRspackConfig,
  createLandingPageConfig,
  createE2eTestAppConfig,
};
