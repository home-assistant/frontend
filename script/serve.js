import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const coreUrl = process.argv[2];
const port = parseInt(process.argv[3] ?? "8123");

const repoDir = path.join(fileURLToPath(import.meta.url), "../..");

import { createProxyMiddleware } from "http-proxy-middleware";

const coreProxy = createProxyMiddleware({
  target: coreUrl,
  changeOrigin: true,
});

const app = express();
app.use("/", express.static(path.join(repoDir, "hass_frontend")));
app.use("/api/hassio/app", express.static(path.join(repoDir, "hassio/build")));
app.use("/api", coreProxy);
app.get("*", (req, res) => {
  res.sendFile(path.join(repoDir, "hass_frontend/index.html"));
});

var server = app.listen(port, () => {
  console.log(
    `Running at http://localhost:${port}, connected to core on ${coreUrl}`
  );
});

process.on("SIGINT", function () {
  console.log("Shutting down file server");
  server.close();
});
