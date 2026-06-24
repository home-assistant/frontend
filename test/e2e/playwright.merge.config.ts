import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html", { outputFolder: "reports/combined", open: "never" }],
    ["json", { outputFile: "reports/combined/results.json" }],
  ],
});
