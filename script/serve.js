import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const port = parseInt(process.argv[2] ?? "8123");
const repoDir = path.join(fileURLToPath(import.meta.url), "../..");

const app = express();
app.use("/", express.static(path.join(repoDir, "hass_frontend")));
app.use("/api/hassio/app", express.static(path.join(repoDir, "hassio/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(repoDir, "hass_frontend/index.html"));
});

app.listen(port, () => {
  console.log(`Running at http://localhost:${port}`);
});
