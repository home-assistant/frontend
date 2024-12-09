import { createProxyMiddleware } from "http-proxy-middleware";
import express from "express";
import { fileURLToPath } from "url";
import fs from "fs";
import http from "http";
import https from "https";
import minimist from "minimist";
import path from "path";

const inDevContainer = process.env.DEVCONTAINER !== undefined;
const parsedArguments = {
  c: inDevContainer
    ? "http://host.docker.internal:8123"
    : "http://localhost:8123",
  p: inDevContainer ? "8123" : "8124",
  ...minimist(process.argv.slice(2)),
};
const coreUrl = parsedArguments.c;
const port = parseInt(parsedArguments.p);
const repoDir = path.join(fileURLToPath(import.meta.url), "../..");
// if the core uses https, also use https for serving to avoid problems
// with headers like Strict-Transport-Security
const useHttps = coreUrl.startsWith("https:");
const frontendBase = `http${useHttps ? "s" : ""}://localhost`;

console.log(`Frontend is hosted on ${frontendBase}:${port}`);
if (inDevContainer && port === 8123) {
  console.log(
    `Frontend is available on container host as ${frontendBase}:8124`
  );
}
console.log(`Core is used from ${coreUrl}`);

const coreProxy = createProxyMiddleware({
  target: coreUrl,
  changeOrigin: true,
  ws: true,
});
const app = express();
app.use("/", express.static(path.join(repoDir, "hass_frontend")));
app.use("/api/hassio/app", express.static(path.join(repoDir, "hassio/build")));
app.use("/api", coreProxy);
app.get("/auth/authorize", (req, res) => {
  res.sendFile(path.join(repoDir, "hass_frontend/authorize.html"));
});
app.use("/auth", coreProxy);
app.get("/onboarding", (req, res) => {
  res.sendFile(path.join(repoDir, "hass_frontend/onboarding.html"));
});
app.get("*", (req, res) => {
  res.sendFile(path.join(repoDir, "hass_frontend/index.html"));
});
app.use("/", coreProxy);

const appServer = useHttps
  ? https.createServer(
      {
        key: fs.readFileSync(repoDir + "/script/serve.key"),
        cert: fs.readFileSync(repoDir + "/script/serve.crt"),
      },
      app
    )
  : http.createServer(app);

const appListener = appServer.listen(port, () => {
  console.log("Starting development server");
});

let connections = [];
appListener.on("connection", (connection) => {
  connections.push(connection);
  connection.on(
    "close",
    () => (connections = connections.filter((curr) => curr !== connection))
  );
});

process.on("SIGINT", function () {
  console.log("Shutting down development server");
  appServer.close();
  // websockets are not closed automatically
  connections.forEach((c) => c.end());
});
