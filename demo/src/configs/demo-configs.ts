import { navigate } from "../../../src/common/navigate";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import type { Lovelace } from "../../../src/panels/lovelace/types";
import { setDemoAreas } from "../stubs/area_registry";
import { energyEntities } from "../stubs/entities";
import { setDemoFloors } from "../stubs/floor_registry";
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
  hass.addEntities(config.entities(hass.localize), true);
  hass.addEntities(energyEntities());

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
