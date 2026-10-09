import type { DemoConfig } from "../types";
import { demoAutomationsSections } from "./automations";
import { demoEntitiesSections } from "./entities";
import { demoLovelaceSections } from "./lovelace";

export const demoSections: DemoConfig = {
  authorName: "Home Assistant",
  authorUrl: "https://github.com/home-assistant/frontend/",
  name: "Home Demo",
  lovelace: demoLovelaceSections,
  entities: demoEntitiesSections,
  automations: demoAutomationsSections,
  theme: { theme: "default", dark: false },
};
