import filterStats from "@bundle-stats/plugin-webpack-filter";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";
import { DefinePlugin, NormalModuleReplacementPlugin } from "@rspack/core";
import { defineConfig } from "@rspack/cli";
import log from "fancy-log";
import { existsSync } from "node:fs";
import path from "node:path";
import { WebpackManifestPlugin } from "rspack-manifest-plugin";
import TerserPlugin from "terser-webpack-plugin";
import { StatsWriterPlugin } from "webpack-stats-plugin";
// @ts-ignore
import WebpackBar from "webpackbar/rspack";
import {
  babelOptions,
  config,
  definedVars,
  emptyPackages,
  sourceMapURL,
  swcOptions,
  terserOptions,
} from "./bundle.ts";
import paths from "./paths.ts";

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

export const createRspackConfig = ({
  name,
  entry,
  outputPath,
  publicPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
  isHassioBuild,
  dontHash,
}: {
  name: string;
  entry: any;
  outputPath: string;
  publicPath: string;
  defineOverlay?: Record<string, any>;
  isProdBuild?: boolean;
  latestBuild?: boolean;
  isStatsBuild?: boolean;
  isTestBuild?: boolean;
  isHassioBuild?: boolean;
  dontHash?: Set<string>;
}) => {
  if (!dontHash) {
    dontHash = new Set();
  }
  return defineConfig({
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
          use: (info) => [
            {
              loader: "babel-loader",
              options: {
                ...babelOptions({
                  latestBuild,
                  isProdBuild,
                  isTestBuild,
                  sw: info.issuerLayer === "sw",
                }),
                cacheDirectory: !isProdBuild,
                cacheCompression: false,
              },
            },
            {
              loader: "builtin:swc-loader",
              options: swcOptions(),
            },
          ],
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
          terserOptions: terserOptions({ latestBuild, isTestBuild }),
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
              ).test(chunk?.name || ""),
      },
    },
    plugins: [
      !isStatsBuild && new WebpackBar({ fancy: !isProdBuild }),
      new WebpackManifestPlugin({
        // Only include the JS of entrypoints
        filter: (file) => file.isInitial && !file.name.endsWith(".map"),
      }),
      new DefinePlugin(
        definedVars({ isProdBuild, latestBuild, defineOverlay })
      ),
      new NormalModuleReplacementPlugin(
        new RegExp(emptyPackages({ isHassioBuild }).join("|")),
        path.resolve(paths.root_dir, "src/util/empty.js")
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
          output: {
            reportDir: path.join(paths.build_dir, "rsdoctor"),
          },
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
        "lit/directives/class-map$": "lit/directives/class-map.js",
        "lit/directives/style-map$": "lit/directives/style-map.js",
        "lit/directives/if-defined$": "lit/directives/if-defined.js",
        "lit/directives/guard$": "lit/directives/guard.js",
        "lit/directives/cache$": "lit/directives/cache.js",
        "lit/directives/join$": "lit/directives/join.js",
        "lit/directives/repeat$": "lit/directives/repeat.js",
        "lit/directives/live$": "lit/directives/live.js",
        "lit/directives/keyed$": "lit/directives/keyed.js",
        "lit/polyfill-support$": "lit/polyfill-support.js",
        "@lit-labs/virtualizer/layouts/grid":
          "@lit-labs/virtualizer/layouts/grid.js",
        "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver":
          "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver.js",
        "@lit-labs/observers/resize-controller":
          "@lit-labs/observers/resize-controller.js",
      },
    },
    output: {
      module: latestBuild,
      filename: ({ chunk }) =>
        !isProdBuild ||
        isStatsBuild ||
        (chunk?.name && dontHash.has(chunk.name))
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
                return new URL(info.resourcePath, sourceMapURL()).href;
              }
            : undefined,
        ])
      ),
    },
    experiments: {
      layers: true,
      outputModule: true,
    },
  });
};

export const createAppConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}: {
  isProdBuild?: boolean;
  latestBuild?: boolean;
  isStatsBuild?: boolean;
  isTestBuild?: boolean;
}) =>
  createRspackConfig(
    config.app({ isProdBuild, latestBuild, isStatsBuild, isTestBuild })
  );

export const createDemoConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
}: {
  isProdBuild?: boolean;
  latestBuild?: boolean;
  isStatsBuild?: boolean;
}) =>
  createRspackConfig(config.demo({ isProdBuild, latestBuild, isStatsBuild }));

export const createCastConfig = ({ isProdBuild, latestBuild }) =>
  createRspackConfig(config.cast({ isProdBuild, latestBuild }));

export const createHassioConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}: {
  isProdBuild?: boolean;
  latestBuild?: boolean;
  isStatsBuild?: boolean;
  isTestBuild?: boolean;
}) =>
  createRspackConfig(
    config.hassio({
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isTestBuild,
    })
  );

export const createGalleryConfig = ({ isProdBuild, latestBuild }) =>
  createRspackConfig(config.gallery({ isProdBuild, latestBuild }));

export const createLandingPageConfig = ({ isProdBuild, latestBuild }) =>
  createRspackConfig(config.landingPage({ isProdBuild, latestBuild }));
