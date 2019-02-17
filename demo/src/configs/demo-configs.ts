import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { Lovelace } from "../../../src/panels/lovelace/types";
import { DemoConfig } from "./types";
import { fireEvent } from "../../../src/common/dom/fire_event";

let lastSelectedLanguage: string | undefined;

export const demoConfigs: Array<() => Promise<DemoConfig>> = [
  () => import("./arsaboo").then((mod) => mod.demoArsaboo),
  () => import("./teachingbirds").then((mod) => mod.demoTeachingbirds),
  () => import("./kernehed").then((mod) => mod.demoKernehed),
  () => import("./jimpower").then((mod) => mod.demoJimpower),
  () => import("./yosilevy").then((mod) => mod.demoYosilevy),
];

export let selectedDemoConfigIndex: number = 0;
export let selectedDemoConfig: Promise<DemoConfig> = demoConfigs[
  selectedDemoConfigIndex
]();

export const setDemoConfig = async (
  host: HTMLElement,
  hass: MockHomeAssistant,
  lovelace: Lovelace,
  index: number
) => {
  const confProm = demoConfigs[index]();
  const config = await confProm;

  // Restore last language if this demo overrode one.
  if (lastSelectedLanguage) {
    fireEvent(host, "hass-language-select", {
      language: lastSelectedLanguage,
    });
    lastSelectedLanguage = undefined;
  }

  selectedDemoConfigIndex = index;
  selectedDemoConfig = confProm;

  hass.addEntities(config.entities(), true);
  lovelace.saveConfig(config.lovelace());
  hass.mockTheme(config.theme());
};

export const setDemoConfigLanguage = async (
  host: HTMLElement,
  hass: MockHomeAssistant
) => {
  const config = await selectedDemoConfig;

  if (config.language) {
    lastSelectedLanguage = hass.selectedLanguage || hass.language;
    fireEvent(host, "hass-language-select", {
      language: config.language,
    });
  }
};
