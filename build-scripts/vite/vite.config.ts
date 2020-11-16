import * as path from "path";
import * as vite from "vite";

// https://github.com/vitejs/vite/blob/master/src/node/config.ts

const ignore = new Set(["/src/resources/compatibility.ts"]);

const conf: vite.ServerConfig = {
  root: path.resolve(__dirname, "../.."),
  optimizeDeps: {
    // We don't automatically optimize dependencies because
    // that causes duplicate imports of custom elements
    auto: false,
  },
  resolvers: [
    // This resolver is meant to filter out files that we don't
    // need in latest build, like compatibility.
    // But resolving it to an empty file doesn't yield expected
    // results.
    // {
    //   requestToFile(publicPath: string, root: string) {
    //     console.log("requestToFile", {
    //       publicPath,
    //       root,
    //       match: ignore.has(publicPath),
    //       resolved:
    //         ignore.has(publicPath) &&
    //         path.resolve(conf.root!, "src/util/empty.js"),
    //     });
    //     if (ignore.has(publicPath)) {
    //       return path.resolve(conf.root!, "src/util/empty.js");
    //     }
    //     return undefined;
    //   },
    //   fileToRequest(filePath: string, root: string) {
    //     if (!filePath.endsWith("/src/util/empty.js")) {
    //       return undefined;
    //     }
    //     console.log("fileToRequest", {
    //       filePath,
    //       root,
    //       match: filePath.endsWith("/src/util/empty.js"),
    //     });
    //     return "/src/util/empty.js";
    //   },
    // },
  ],
  // These don't seem to be picked up. Workaround is to manually
  // add them to hass_frontend/index.html for now.
  define: {
    __DEV__: true,
    __BUILD__: "latest",
    __VERSION__: "dev",
    __DEMO__: false,
    __BACKWARDS_COMPAT__: false,
    __STATIC_PATH__: "/static/",
  },
  cors: true,
};
console.log(conf);
export default conf;
