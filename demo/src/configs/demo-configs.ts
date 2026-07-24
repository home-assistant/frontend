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

export const demoConfigs: Record<string, () => Promise<DemoConfig>> = {
  sections: () => import("./sections").then((mod) => mod.demoSections),
  arsaboo: () => import("./arsaboo").then((mod) => mod.demoArsaboo),
  teachingbirds: () =>
    import("./teachingbirds").then((mod) => mod.demoTeachingbirds),
  kernehed: () => import("./kernehed").then((mod) => mod.demoKernehed),
  jimpower: () => import("./jimpower").then((mod) => mod.demoJimpower),
};

const initialDemoConfigIndex = () => {
  const slug = new URLSearchParams(window.location.search).get("demo");
  const index = slug
    ? Object.keys(demoConfigs).indexOf(slug.toLowerCase())
    : -1;
  return index === -1 ? 0 : index;
};

// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfigIndex = initialDemoConfigIndex();
// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfig: Promise<DemoConfig> =
  Object.values(demoConfigs)[selectedDemoConfigIndex]();

export const setDemoConfig = async (
  hass: MockHomeAssistant,
  lovelace: Lovelace,
  index: number
) => {
  const confProm = Object.values(demoConfigs)[index]();
  const config = await confProm;

  selectedDemoConfigIndex = index;
  selectedDemoConfig = confProm;

  hass.addEntities(config.entities(hass.localize), true);
  hass.addEntities(energyEntities());
  lovelace.saveConfig(config.lovelace(hass.localize));
  applyDemoTheme(hass, config.theme);
};
