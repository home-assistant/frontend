import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import gulp from "gulp";
import paths from "../paths.cjs";

const SOURCE_URL =
  process.env.SENSOR_METADATA_URL ||
  "https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/generated/sensor.json";

const TARGET = join(
  paths.root_dir,
  "src",
  "data",
  "sensor_numeric_device_classes.ts"
);

gulp.task("gen-numeric-device-classes", async () => {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
  }

  const data = await response.json();
  const classes = [...(data.numeric_device_classes ?? [])].sort();
  if (!classes.length) {
    throw new Error(`No numeric_device_classes found in ${SOURCE_URL}`);
  }

  const content = `// This file is auto-generated from Home Assistant Core's \`SensorDeviceClass\`
// (all values minus \`NON_NUMERIC_DEVICE_CLASSES\`). Do not edit by hand.
// Regenerate with \`script/gen_numeric_device_classes\`.

export const SENSOR_NUMERIC_DEVICE_CLASSES: string[] = [
${classes.map((deviceClass) => `  "${deviceClass}",`).join("\n")}
];
`;

  await writeFile(TARGET, content);
});
