import { navigate } from "../../../src/common/navigate";
import { slugify } from "../../../src/common/string/slugify";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import type { Lovelace } from "../../../src/panels/lovelace/types";
import { setDemoAreas } from "../stubs/area_registry";
import { setPlatformEntityRegistryEntries } from "../stubs/entity_registry";
import { energyEntities } from "../stubs/entities";
import { connectivityEntities } from "../stubs/connectivity/fixtures";
import { setDemoFloors } from "../stubs/floor_registry";
import { getDemoTheme } from "../stubs/frontend";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { DemoAutomation, DemoConfig, DemoTheme } from "./types";

export const applyDemoTheme = (hass: MockHomeAssistant, theme: DemoTheme) => {
  if (typeof theme === "function") {
    hass.mockTheme(theme());
    return;
  }
  hass.mockTheme(null, getDemoTheme(theme));
};

export const automationEntity = ({
  config: automation,
  entityId,
  state = "on",
  icon,
  lastTriggered,
}: DemoAutomation): EntityInput => ({
  entity_id: entityId ?? `automation.${slugify(automation.alias)}`,
  platform: "automation",
  state,
  attributes: {
    id: automation.id,
    friendly_name: automation.alias,
    last_triggered:
      lastTriggered === undefined
        ? null
        : new Date(Date.now() - lastTriggered * 60000).toISOString(),
    mode: automation.mode ?? "single",
    current: 0,
    // Like core, only the modes that can run more than once have a maximum
    ...((automation.mode === "queued" || automation.mode === "parallel") && {
      max: automation.max ?? 10,
    }),
    icon,
  },
});

// Automations saved in the editor during this session, per demo
// Automations saved in the editor during this session, per demo. A deleted
// automation is null.
const savedAutomations: Record<
  string,
  Record<string, DemoAutomation | null>
> = {};

export const saveDemoAutomation = (
  id: string,
  automation: DemoAutomation | null
) => {
  savedAutomations[selectedDemo] = {
    ...savedAutomations[selectedDemo],
    [id]: automation,
  };
};

// The automations of a demo config, with the ones saved in the editor
export const demoAutomations = (
  demo: string,
  config: DemoConfig
): DemoAutomation[] => {
  const saved = savedAutomations[demo] ?? {};
  const configured = config.automations ?? [];
  const ids = new Set(configured.map((automation) => automation.config.id));
  return [
    ...configured.map((automation) =>
      automation.config.id in saved ? saved[automation.config.id] : automation
    ),
    ...Object.values(saved).filter(
      (automation) => automation && !ids.has(automation.config.id)
    ),
  ].filter((automation): automation is DemoAutomation => automation !== null);
};

// The automation entities are derived from the configs the editor shows, so
// their names and IDs always match.
export const demoConfigEntities = (
  demo: string,
  config: DemoConfig,
  localize: LocalizeFunc
): EntityInput[] => [
  ...config.entities(localize),
  ...demoAutomations(demo, config).map(automationEntity),
];

// Like core, the automations of a demo config are in the entity registry
export const registerDemoAutomations = (
  hass: MockHomeAssistant,
  demo: string,
  config: DemoConfig
) =>
  setPlatformEntityRegistryEntries(
    hass,
    "automation",
    demoAutomations(demo, config).map((automation) => ({
      entity_id: automationEntity(automation).entity_id,
      unique_id: automation.config.id,
    }))
  );

export const demoConfigs: Record<string, () => Promise<DemoConfig>> = {
  sections: () => import("./sections").then((mod) => mod.demoSections),
  home: () => import("./home").then((mod) => mod.demoHome),
  arsaboo: () => import("./arsaboo").then((mod) => mod.demoArsaboo),
  teachingbirds: () =>
    import("./teachingbirds").then((mod) => mod.demoTeachingbirds),
  kernehed: () => import("./kernehed").then((mod) => mod.demoKernehed),
  jimpower: () => import("./jimpower").then((mod) => mod.demoJimpower),
};

export const demos = Object.keys(demoConfigs);

const initialDemo = () => {
  const slug = new URLSearchParams(window.location.search).get("demo");
  return slug && demos.includes(slug) ? slug : demos[0];
};

// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemo = initialDemo();
// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfig: Promise<DemoConfig> =
  demoConfigs[selectedDemo]();

export const setDemoConfig = async (
  hass: MockHomeAssistant,
  lovelace: Lovelace,
  demo: string
) => {
  const confProm = demoConfigs[demo]();
  const config = await confProm;

  selectedDemo = demo;
  selectedDemoConfig = confProm;

  setDemoFloors(hass, config.floors);
  setDemoAreas(hass, config.areas);
  hass.addEntities(demoConfigEntities(demo, config, hass.localize), true);
  registerDemoAutomations(hass, demo, config);
  hass.addEntities(energyEntities());
  // Replaced the whole state map above, so the entities that do not belong to a
  // demo config have to be added back.
  hass.addEntities(connectivityEntities());

  // Let the new registries and entities reach the dashboard before saving the
  // config, so dashboard strategies generate against them
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  await lovelace.saveConfig(config.lovelace(hass.localize));
  // The view of the previous demo might not exist in the new one
  navigate(`/${hass.panelUrl}?demo=${demo}`, { replace: true });
  applyDemoTheme(hass, config.theme);
};
