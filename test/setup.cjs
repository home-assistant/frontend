const fs = require("fs");
const path = require("path");

process.env.TZ = "Etc/UTC";
process.env.IS_TEST = "true";

global.window = {};
global.navigator = {};

const MDI_OUTPUT_DIR = path.resolve(__dirname, "../build/mdi");

if (!fs.existsSync(MDI_OUTPUT_DIR)) {
  fs.mkdirSync(MDI_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.resolve(MDI_OUTPUT_DIR, "iconMetadata.json"), "{}");
}
