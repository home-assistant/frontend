import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import type { Lovelace } from "../../../src/panels/lovelace/types";
import { energyEntities } from "../stubs/entities";
import { getDemoTheme } from "../stubs/frontend";
import type { DemoConfig, DemoTheme } from "./types";

export const applyDemoTheme = (hass: MockHomeAssistant, theme: DemoTheme) => {
  if (typeof theme === "function") {
    hass.mockTheme(theme());
    return;
  }
  hass.mockTheme(null, getDemoTheme(theme));
};

// The slug allows opening a demo directly via e.g. /?demo=arsaboo
export const demoConfigs: {
  slug: string;
  load: () => Promise<DemoConfig>;
}[] = [
  {
    slug: "sections",
    load: () => import("./sections").then((mod) => mod.demoSections),
  },
  {
    slug: "arsaboo",
    load: () => import("./arsaboo").then((mod) => mod.demoArsaboo),
  },
  {
    slug: "teachingbirds",
    load: () => import("./teachingbirds").then((mod) => mod.demoTeachingbirds),
  },
  {
    slug: "kernehed",
    load: () => import("./kernehed").then((mod) => mod.demoKernehed),
  },
  {
    slug: "jimpower",
    load: () => import("./jimpower").then((mod) => mod.demoJimpower),
  },
];

const initialDemoConfigIndex = () => {
  const slug = new URLSearchParams(window.location.search).get("demo");
  const index = slug
    ? demoConfigs.findIndex((conf) => conf.slug === slug.toLowerCase())
    : -1;
  return index === -1 ? 0 : index;
};

// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfigIndex = initialDemoConfigIndex();
// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfig: Promise<DemoConfig> =
  demoConfigs[selectedDemoConfigIndex].load();

export const setDemoConfig = async (
  hass: MockHomeAssistant,
  lovelace: Lovelace,
  index: number
) => {
  const confProm = demoConfigs[index].load();
  const config = await confProm;

  selectedDemoConfigIndex = index;
  selectedDemoConfig = confProm;

  hass.addEntities(config.entities(hass.localize), true);
  hass.addEntities(energyEntities());
  lovelace.saveConfig(config.lovelace(hass.localize));
  applyDemoTheme(hass, config.theme);
};
