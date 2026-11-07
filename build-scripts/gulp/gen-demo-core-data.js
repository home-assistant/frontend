// Generates the service, trigger and condition descriptions the demo and
// gallery serve instead of a backend, from the files in Home Assistant Core.
import gulp from "gulp";
import { CORE_SCHEMA, load, mergeTag } from "js-yaml";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import prettier from "prettier";
import paths from "../paths.cjs";

const CORE_URL =
  process.env.CORE_COMPONENTS_URL ||
  "https://raw.githubusercontent.com/home-assistant/core/refs/heads/dev/homeassistant/components";

// Integrations whose services the mocked backend provides
export const SERVICE_DOMAINS = [
  "alarm_control_panel",
  "automation",
  "button",
  "calendar",
  "camera",
  "climate",
  "conversation",
  "counter",
  "cover",
  "device_tracker",
  "fan",
  "frontend",
  "group",
  "homeassistant",
  "humidifier",
  "image_processing",
  "input_boolean",
  "input_button",
  "input_datetime",
  "input_number",
  "input_select",
  "input_text",
  "lawn_mower",
  "light",
  "lock",
  "logger",
  "media_player",
  "notify",
  "number",
  "persistent_notification",
  "person",
  "recorder",
  "remote",
  "scene",
  "schedule",
  "script",
  "select",
  "siren",
  "switch",
  "system_log",
  "text",
  "timer",
  "todo",
  "tts",
  "update",
  "vacuum",
  "valve",
  "water_heater",
  "weather",
  "zone",
];

// Services that return data. Core sets this when it registers a service, it is
// not part of services.yaml. The value is whether the response is optional.
const RESPONSE_SERVICES = {
  "calendar.get_events": false,
  "conversation.process": true,
  "media_player.browse_media": false,
  "media_player.search_media": false,
  "recorder.get_statistics": false,
  "schedule.get_schedule": false,
  "todo.get_items": false,
  "weather.get_forecasts": false,
};

// Services that are still in services.yaml, but that core no longer registers
const UNREGISTERED_SERVICES = ["weather.get_forecast"];

// Integrations that provide the new style triggers and conditions
const AUTOMATION_PLATFORM_DOMAINS = [
  "air_quality",
  "alarm_control_panel",
  "assist_satellite",
  "battery",
  "button",
  "calendar",
  "climate",
  "counter",
  "cover",
  "door",
  "doorbell",
  "event",
  "fan",
  "garage_door",
  "gate",
  "humidifier",
  "humidity",
  "illuminance",
  "lawn_mower",
  "light",
  "lock",
  "media_player",
  "moisture",
  "moon",
  "motion",
  "occupancy",
  "power",
  "remote",
  "scene",
  "schedule",
  "select",
  "siren",
  "sun",
  "switch",
  "temperature",
  "text",
  "timer",
  "todo",
  "update",
  "vacuum",
  "valve",
  "vibration",
  "water_heater",
  "window",
  "zone",
];

// YAML 1.2 with merge keys, which matches how core reads these files
const YAML_SCHEMA = CORE_SCHEMA.withTags([mergeTag]);

const HEADER = `// This file is auto-generated from Home Assistant Core. Do not edit by hand.
// Regenerate with \`script/gen_demo_core_data\`.`;

const fetchCoreFile = async (domain, file) => {
  const url = `${CORE_URL}/${domain}/${file}`;
  const response = await fetch(url);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

// Fetches a file of every domain, keyed by domain
const fetchCoreFiles = async (domains, file) =>
  Object.fromEntries(
    await Promise.all(
      domains.map(async (domain) => [domain, await fetchCoreFile(domain, file)])
    )
  );

const parseYaml = (content) => load(content, { schema: YAML_SCHEMA }) ?? {};

// Enum references look like "cover.CoverEntityFeature.OPEN"
const ENUM_REFERENCE = /^([a-z_]+)\.[A-Z]\w*\.[A-Z0-9_]+$/;

const enumDomains = (value, domains = new Set()) => {
  if (typeof value === "string") {
    const match = value.match(ENUM_REFERENCE);
    if (match) {
      domains.add(match[1]);
    }
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((val) => enumDomains(val, domains));
  }
  return domains;
};

// Resolves "<domain>.<Enum>.<MEMBER>" to the value of the member, like core
const enumResolver = async (yamls) => {
  const domains = [...enumDomains(yamls)];
  const [consts, inits] = await Promise.all([
    fetchCoreFiles(domains, "const.py"),
    fetchCoreFiles(domains, "__init__.py"),
  ]);
  return (reference) => {
    const [domain, enumName, member] = reference.split(".");
    for (const source of [consts[domain], inits[domain]]) {
      const match = source
        ?.split(`class ${enumName}(`)[1]
        ?.match(new RegExp(`\\n\\s+${member} = ("[^"]*"|\\d+)`));
      if (match) {
        return JSON.parse(match[1]);
      }
    }
    throw new Error(`Unknown enum ${reference}`);
  };
};

const createResolvers = (enumValue) => {
  // In entity filters, every item of the supported features, a feature or a
  // list of features, becomes one bit mask
  const featureMask = (features) =>
    [].concat(features).reduce(
      // eslint-disable-next-line no-bitwise
      (mask, feature) => mask | enumValue(feature),
      0
    );

  const resolveSelector = (value) => {
    if (Array.isArray(value)) {
      return value.map(resolveSelector);
    }
    if (!value || typeof value !== "object") {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        key === "supported_features"
          ? [].concat(val).map(featureMask)
          : resolveSelector(val),
      ])
    );
  };

  // Like core, an empty target allows any target
  const resolveTarget = (target) => resolveSelector(target ?? {});

  // Field filters keep their lists, with every enum resolved on its own
  const resolveField = (field) => {
    const result = { ...field };
    if (field.selector) {
      result.selector = resolveSelector(field.selector);
    }
    if (field.filter?.supported_features) {
      result.filter = {
        ...result.filter,
        supported_features: field.filter.supported_features.map(enumValue),
      };
    }
    if (field.filter?.attribute) {
      result.filter = {
        ...result.filter,
        attribute: Object.fromEntries(
          Object.entries(field.filter.attribute).map(([name, options]) => [
            name,
            options.map(enumValue),
          ])
        ),
      };
    }
    return result;
  };

  // Fields can be grouped in sections, which hold fields themselves
  const resolveFields = (fields) =>
    Object.fromEntries(
      Object.entries(fields ?? {}).map(([key, field]) => [
        key,
        field && "fields" in field && !("selector" in field)
          ? { ...field, fields: resolveFields(field.fields) }
          : resolveField(field ?? {}),
      ])
    );

  return { resolveFields, resolveTarget };
};

// Mirrors how core builds the response of get_services
const serviceDescriptions = (yamls, { resolveFields, resolveTarget }) =>
  Object.fromEntries(
    SERVICE_DOMAINS.map((domain) => {
      if (!yamls[domain]) {
        throw new Error(`No services.yaml found for ${domain}`);
      }
      const services = Object.entries(yamls[domain])
        .filter(
          ([service]) =>
            !service.startsWith(".") &&
            !UNREGISTERED_SERVICES.includes(`${domain}.${service}`)
        )
        .map(([service, value]) => {
          const description = { fields: resolveFields(value?.fields) };
          for (const item of ["description", "name"]) {
            if (value && item in value) {
              description[item] = value[item];
            }
          }
          if (value && "target" in value) {
            description.target = resolveTarget(value.target);
          }
          const key = `${domain}.${service}`;
          if (key in RESPONSE_SERVICES) {
            description.response = { optional: RESPONSE_SERVICES[key] };
          }
          return [service, description];
        });
      return [domain, Object.fromEntries(services)];
    })
  );

// Mirrors how core builds the trigger and condition platform descriptions
const platformDescriptions = (yamls, { resolveFields, resolveTarget }) =>
  Object.fromEntries(
    AUTOMATION_PLATFORM_DOMAINS.flatMap((domain) =>
      Object.entries(yamls[domain] ?? {})
        // Keys starting with a dot only hold YAML anchors
        .filter(([key, value]) => !key.startsWith(".") && value)
        .map(([key, value]) => {
          const absoluteKey = !key.startsWith("_")
            ? `${domain}.${key}`
            : key.slice(1) || domain;
          const description = { fields: resolveFields(value.fields) };
          if ("target" in value) {
            description.target = resolveTarget(value.target);
          }
          return [absoluteKey, description];
        })
    )
  );

// The trigger or condition icons of every domain that has them
const platformIcons = (icons, category) =>
  Object.fromEntries(
    Object.entries(icons)
      .map(([domain, content]) => [
        domain,
        content ? JSON.parse(content)[category] : undefined,
      ])
      .filter(([, categoryIcons]) => categoryIcons)
  );

const parseYamls = (files) =>
  Object.fromEntries(
    Object.entries(files)
      .filter(([, content]) => content !== undefined)
      .map(([domain, content]) => [domain, parseYaml(content)])
  );

const writeTs = async (path, content) => {
  const file = join(paths.root_dir, path);
  const options = await prettier.resolveConfig(file);
  await writeFile(
    file,
    await prettier.format(`${HEADER}\n${content}`, {
      ...options,
      filepath: file,
    })
  );
};

gulp.task("gen-demo-core-data", async () => {
  const [servicesFiles, triggersFiles, conditionsFiles, iconsFiles] =
    await Promise.all([
      fetchCoreFiles(SERVICE_DOMAINS, "services.yaml"),
      fetchCoreFiles(AUTOMATION_PLATFORM_DOMAINS, "triggers.yaml"),
      fetchCoreFiles(AUTOMATION_PLATFORM_DOMAINS, "conditions.yaml"),
      fetchCoreFiles(AUTOMATION_PLATFORM_DOMAINS, "icons.json"),
    ]);
  const servicesYamls = parseYamls(servicesFiles);
  const triggersYamls = parseYamls(triggersFiles);
  const conditionsYamls = parseYamls(conditionsFiles);
  const resolvers = createResolvers(
    await enumResolver([servicesYamls, triggersYamls, conditionsYamls])
  );
  for (const key of UNREGISTERED_SERVICES) {
    const [domain, service] = key.split(".");
    if (!(service in (servicesYamls[domain] ?? {}))) {
      throw new Error(`Remove ${key} from UNREGISTERED_SERVICES, it is gone`);
    }
  }
  const services = serviceDescriptions(servicesYamls, resolvers);
  for (const key of Object.keys(RESPONSE_SERVICES)) {
    const [domain, service] = key.split(".");
    if (!services[domain]?.[service]) {
      throw new Error(`Service ${key} that returns a response does not exist`);
    }
  }
  const triggers = platformDescriptions(triggersYamls, resolvers);
  const conditions = platformDescriptions(conditionsYamls, resolvers);
  const icons = {
    triggers: platformIcons(iconsFiles, "triggers"),
    conditions: platformIcons(iconsFiles, "conditions"),
  };

  await Promise.all([
    writeTs(
      "src/fake_data/demo_services.ts",
      `import type { HassServices } from "home-assistant-js-websocket";

// Core sends more than the HassServices type covers, like sections and list
// examples.
export const demoServices = ${JSON.stringify(services)} as unknown as HassServices;
`
    ),
    writeTs(
      "demo/src/stubs/automation_platform_domains.ts",
      `
// Integrations that provide the new style triggers and conditions. Their
// translations are part of the demo build.
export const automationPlatformDomains = ${JSON.stringify(AUTOMATION_PLATFORM_DOMAINS)};
`
    ),
    writeTs(
      "demo/src/stubs/automation_platforms_data.ts",
      `import type { ConditionDescriptions } from "../../../src/data/condition";
import type { TriggerDescriptions } from "../../../src/data/trigger";

export const triggerDescriptions: TriggerDescriptions = ${JSON.stringify(triggers)};

export const conditionDescriptions: ConditionDescriptions = ${JSON.stringify(conditions)};
`
    ),
    writeTs(
      "demo/src/stubs/automation_platforms_icons.ts",
      `
export const triggerIcons = ${JSON.stringify(icons.triggers)};

export const conditionIcons = ${JSON.stringify(icons.conditions)};
`
    ),
  ]);
});
