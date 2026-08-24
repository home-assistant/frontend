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
  "sensor_entity_constants.ts"
);

gulp.task("gen-sensor-entity-constants", async () => {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
  }

  const data = await response.json();
  const numericDeviceClasses = [...(data.numeric_device_classes ?? [])].sort();
  const deviceClassUnits = data.device_class_units ?? {};
  const convertibleClassUnits = data.convertible_units ?? {};
  const stateClasses = [...(data.state_classes ?? [])].sort();
  const stateClassUnits = data.state_class_units ?? {};
  if (
    !numericDeviceClasses.length ||
    !stateClasses.length ||
    !Object.keys(deviceClassUnits).length ||
    !Object.keys(stateClassUnits).length
  ) {
    throw new Error(
      `No sensor device classes, state classes or units found in ${SOURCE_URL}`
    );
  }

  const content = `// This file is auto-generated from Home Assistant Core's \`DEVICE_CLASS_UNITS\`
// and \`STATE_CLASS_UNITS\`) and \`SensorDeviceClass\`
// (all values minus \`NON_NUMERIC_DEVICE_CLASSES\`). Do not edit by hand.
// Regenerate with \`script/gen_sensor_entity_constants\`.

export const SENSOR_NUMERIC_DEVICE_CLASSES: string[] = [
${numericDeviceClasses.map((deviceClass) => `  "${deviceClass}",`).join("\n")}
];

export const SENSOR_DEVICE_CLASS_UNITS: Record<string, string[]> = {
${Object.entries(deviceClassUnits)
  .map(
    ([deviceClass, units]) =>
      `  ${deviceClass}: [${units.map((u) => (u === null ? "null" : `"${u}"`)).join(", ")}],`
  )
  .join("\n")}
};

export const SENSOR_DEVICE_CLASS_CONVERTIBLE_UNITS: Record<string, string[]> = {
${Object.entries(convertibleClassUnits)
  .map(
    ([deviceClass, units]) =>
      `  ${deviceClass}: [${units.map((u) => (u === null ? "null" : `"${u}"`)).join(", ")}],`
  )
  .join("\n")}
};

export const SENSOR_STATE_CLASSES: string[] = [
${stateClasses.map((stateClass) => `  "${stateClass}",`).join("\n")}
];

export const SENSOR_STATE_CLASS_UNITS: Record<string, string[]> = {
${Object.entries(stateClassUnits)
  .map(
    ([stateClass, units]) =>
      `  ${stateClass}: [${units.map((u) => (u === null ? "null" : `"${u}"`)).join(", ")}],`
  )
  .join("\n")}
};
`;

  await writeFile(TARGET, content);
});
