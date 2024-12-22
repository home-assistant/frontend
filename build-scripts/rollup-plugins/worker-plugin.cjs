// Worker plugin
// Each worker will include all of its dependencies
// instead of relying on an importer.

// Forked from v.1.4.1
// https://github.com/surma/rollup-plugin-off-main-thread
/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const rollup = require("rollup");
const path = require("path");
const MagicString = require("magic-string");

const defaultOpts = {
  // A RegExp to find `new Workers()` calls. The second capture group _must_
  // capture the provided file name without the quotes.
  workerRegexp: /new Worker\((["'])(.+?)\1(,[^)]+)?\)/g,
  plugins: ["node-resolve", "commonjs", "babel", "terser", "ignore"],
};

async function getBundledWorker(workerPath, rollupOptions) {
  const bundle = await rollup.rollup({
    ...rollupOptions,
    input: {
      worker: workerPath,
    },
  });
  const { output } = await bundle.generate({
    // Generates cleanest output, we shouldn't have any imports/exports
    // that would be incompatible with ES5.
    format: "es",
    // We should not export anything. This will fail build if we are.
    exports: "none",
  });

  let code;

  for (const chunkOrAsset of output) {
    if (chunkOrAsset.name === "worker") {
      code = chunkOrAsset.code;
    } else if (chunkOrAsset.type !== "asset") {
      throw new Error("Unexpected extra output");
    }
  }

  return code;
}

module.exports = function (opts = {}) {
  opts = { ...defaultOpts, ...opts };

  let rollupOptions;
  let refIds;

  return {
    name: "hass-worker",

    async buildStart(options) {
      refIds = {};
      rollupOptions = {
        plugins: options.plugins.filter((plugin) =>
          opts.plugins.includes(plugin.name)
        ),
      };
    },

    async transform(code, id) {
      // Copy the regexp as they are stateful and this hook is async.
      const workerRegexp = new RegExp(
        opts.workerRegexp.source,
        opts.workerRegexp.flags
      );
      if (!workerRegexp.test(code)) {
        return undefined;
      }

      const ms = new MagicString(code);
      // Reset the regexp
      workerRegexp.lastIndex = 0;
      for (;;) {
        const match = workerRegexp.exec(code);
        if (!match) {
          break;
        }

        const workerFile = match[2];
        let optionsObject = {};
        // Parse the optional options object
        if (match[3] && match[3].length > 0) {
          // FIXME: ooooof!
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          optionsObject = new Function(`return ${match[3].slice(1)};`)();
        }
        delete optionsObject.type;

        if (!/^.*\//.test(workerFile)) {
          this.warn(
            `Paths passed to the Worker constructor must be relative or absolute, i.e. start with /, ./ or ../ (just like dynamic import!). Ignoring "${workerFile}".`
          );
          continue;
        }

        // Find worker file and store it as a chunk with ID prefixed for our loader
        // eslint-disable-next-line no-await-in-loop
        const resolvedWorkerFile = (await this.resolve(workerFile, id)).id;
        let chunkRefId;
        if (resolvedWorkerFile in refIds) {
          chunkRefId = refIds[resolvedWorkerFile];
        } else {
          this.addWatchFile(resolvedWorkerFile);
          // eslint-disable-next-line no-await-in-loop
          const source = await getBundledWorker(
            resolvedWorkerFile,
            rollupOptions
          );
          chunkRefId = refIds[resolvedWorkerFile] = this.emitFile({
            name: path.basename(resolvedWorkerFile),
            source,
            type: "asset",
          });
        }

        const workerParametersStartIndex = match.index + "new Worker(".length;
        const workerParametersEndIndex =
          match.index + match[0].length - ")".length;

        ms.overwrite(
          workerParametersStartIndex,
          workerParametersEndIndex,
          `import.meta.ROLLUP_FILE_URL_${chunkRefId}, ${JSON.stringify(
            optionsObject
          )}`
        );
      }

      return {
        code: ms.toString(),
        map: ms.generateMap({ hires: true }),
      };
    },
  };
};
