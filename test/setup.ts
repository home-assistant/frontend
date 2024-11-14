import fs from "node:fs";
import path from "node:path";
import { beforeAll } from "vitest";

beforeAll(() => {
  global.window = {} as any;
  global.navigator = {} as any;

  global.__DEMO__ = false;

  const MDI_OUTPUT_DIR = path.resolve(__dirname, "../build/mdi");

  if (!fs.existsSync(MDI_OUTPUT_DIR)) {
    fs.mkdirSync(MDI_OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.resolve(MDI_OUTPUT_DIR, "iconMetadata.json"), "{}");
  }
});
