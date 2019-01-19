import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { Lovelace } from "../../../src/panels/lovelace/types";
import { DemoConfig } from "./types";

export const demoConfigs: Array<() => Promise<DemoConfig>> = [
  () => import("./kernehed").then((mod) => mod.demoKernehed),
  () => import("./jimpower").then((mod) => mod.demoJimpower),
];

export let selectedDemoConfigIndex: number = 0;
export let selectedDemoConfig: Promise<DemoConfig> = demoConfigs[
  selectedDemoConfigIndex
]();

export const setDemoConfig = async (
  hass: MockHomeAssistant,
  lovelace: Lovelace,
  index: number
) => {
  selectedDemoConfigIndex = index;
  selectedDemoConfig = demoConfigs[index]();
  const config = await selectedDemoConfig;
  hass.addEntities(config.entities(), true);
  lovelace.saveConfig(config.lovelace());
};
