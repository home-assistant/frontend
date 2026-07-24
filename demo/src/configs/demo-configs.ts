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

  hass.addEntities(config.entities(hass.localize), true);
  hass.addEntities(energyEntities());
  lovelace.saveConfig(config.lovelace(hass.localize));
  applyDemoTheme(hass, config.theme);
};
