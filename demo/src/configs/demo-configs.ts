import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { Lovelace } from "../../../src/panels/lovelace/types";
import { DemoConfig } from "./types";

export const demoConfigs: Array<() => Promise<DemoConfig>> = [
  () =>
    import(/* webpackChunkName: "arsaboo" */ "./arsaboo").then(
      (mod) => mod.demoArsaboo
    ),
  () =>
    import(/* webpackChunkName: "teachingbirds" */ "./teachingbirds").then(
      (mod) => mod.demoTeachingbirds
    ),
  () =>
    import(/* webpackChunkName: "kernehed" */ "./kernehed").then(
      (mod) => mod.demoKernehed
    ),
  () =>
    import(/* webpackChunkName: "jimpower" */ "./jimpower").then(
      (mod) => mod.demoJimpower
    ),
];

// eslint-disable-next-line import/no-mutable-exports
export let selectedDemoConfigIndex = 0;
// eslint-disable-next-line import/no-mutable-exports
export let selectedDemoConfig: Promise<DemoConfig> = demoConfigs[
  selectedDemoConfigIndex
]();

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
  lovelace.saveConfig(config.lovelace(hass.localize));
  hass.mockTheme(config.theme());
};
