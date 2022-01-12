import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { Lovelace } from "../../../src/panels/lovelace/types";
import { energyEntities } from "../stubs/entities";
import { DemoConfig } from "./types";

export const demoConfigs: Array<() => Promise<DemoConfig>> = [
  () => import("./arsaboo").then((mod) => mod.demoArsaboo),
  () => import("./teachingbirds").then((mod) => mod.demoTeachingbirds),
  () => import("./kernehed").then((mod) => mod.demoKernehed),
  () => import("./jimpower").then((mod) => mod.demoJimpower),
];

// eslint-disable-next-line import/no-mutable-exports
export let selectedDemoConfigIndex = 0;
// eslint-disable-next-line import/no-mutable-exports
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

  hass.addEntities(config.entities(hass.localize), true);
  hass.addEntities(energyEntities());
  lovelace.saveConfig(config.lovelace(hass.localize));
  hass.mockTheme(config.theme());
};
