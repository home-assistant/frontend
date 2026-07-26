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

export const demoConfigs: (() => Promise<DemoConfig>)[] = [
  () => import("./sections").then((mod) => mod.demoSections),
  () => import("./home").then((mod) => mod.demoHome),
  () => import("./arsaboo").then((mod) => mod.demoArsaboo),
  () => import("./teachingbirds").then((mod) => mod.demoTeachingbirds),
  () => import("./kernehed").then((mod) => mod.demoKernehed),
  () => import("./jimpower").then((mod) => mod.demoJimpower),
];

// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfigIndex = 0;
// eslint-disable-next-line import-x/no-mutable-exports
export let selectedDemoConfig: Promise<DemoConfig> =
  demoConfigs[selectedDemoConfigIndex]();

export const setDemoConfig = async (
  hass: MockHomeAssistant,
  lovelace: Lovelace,
  index: number
) => {
  const confProm = demoConfigs[index]();
  const config = await confProm;

  selectedDemoConfigIndex = index;
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
  navigate(`/${hass.panelUrl}`, { replace: true });
  applyDemoTheme(hass, config.theme);
};
