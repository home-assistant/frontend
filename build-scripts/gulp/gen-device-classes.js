import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import gulp from "gulp";
import paths from "../paths.cjs";

const SOURCE_URL =
  process.env.SENSOR_METADATA_URL ||
  "https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/generated/device_classes.json";

const TARGET = join(
  paths.root_dir,
  "src",
  "data",
  "sensor_entity_constants.ts"
);

gulp.task("gen-device-classes", async () => {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
  }

  const data = await response.json();
  const domainDeviceClasses = data ?? {};
  if (!Object.keys(domainDeviceClasses).length) {
    throw new Error(`No device classes found in ${SOURCE_URL}`);
  }

  const content = `// This file is auto-generated from Home Assistant Core's
// entity platform device classes. Do not edit by hand.
// Regenerate with \`script/gen_device_classes\`.

export const DOMAIN_DEVICE_CLASSES: Record<string, string[]> = {
${Object.entries(domainDeviceClasses)
  .map(
    ([domain, deviceClasses]) =>
      `  "${domain}": [${deviceClasses.map((deviceClass) => `"${deviceClass}"`).join(", ")}],`
  )
  .join("\n")}
};
`;

  await writeFile(TARGET, content);
});
