import express from "express";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const coreUrl = process.argv[2];
const port = parseInt(process.argv[3] ?? "8123");

const repoDir = path.join(fileURLToPath(import.meta.url), "../..");

import { createProxyMiddleware } from "http-proxy-middleware";

const coreProxy = createProxyMiddleware({
  target: coreUrl,
  changeOrigin: true,
  ws: true,
});

const app = express();
app.use("/", express.static(path.join(repoDir, "hass_frontend")));
app.use("/api/hassio/app", express.static(path.join(repoDir, "hassio/build")));
app.use("/api", coreProxy);
app.get("*", (req, res) => {
  res.sendFile(path.join(repoDir, "hass_frontend/index.html"));
});

// if the core uses https, also use https for serving to avoid problems
// with headers like Strict-Transport-Security
const useHttps = coreUrl.startsWith("https:");

const appServer = useHttps
  ? https.createServer(
      {
        key: fs.readFileSync(repoDir + "/script/serve.key"),
        cert: fs.readFileSync(repoDir + "/script/serve.crt"),
      },
      app
    )
  : app;

const frontendBase = `http${useHttps ? "s" : ""}://localhost`;
appServer.listen(port, () => {
  if (process.env.DEVCONTAINER !== undefined) {
    console.log(
      `Frontend is available inside container as ${frontendBase}:${port}`
    );
    if (port === 8123) {
      console.log(
        `Frontend is available on container host as ${frontendBase}://localhost:8124`
      );
    }
  } else {
    console.log(`Frontend is hosted on ${frontendBase}:${port}`);
  }
  console.log(`Core is used from ${coreUrl}`);
});

process.on("SIGINT", function () {
  console.log("Shutting down file server");
  process.exit(0);
});
