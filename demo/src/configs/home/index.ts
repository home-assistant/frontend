import type { DemoConfig } from "../types";
import { demoAreasHome, demoFloorsHome } from "./areas";
import { demoEntitiesHome } from "./entities";
import { demoLovelaceHome } from "./lovelace";

export const demoHome: DemoConfig = {
  authorName: "Home Assistant",
  authorUrl: "https://www.home-assistant.io",
  name: "Home page",
  description:
    "The page you land on when you open Home Assistant, automatically built from the areas in your home and the devices in them.",
  lovelace: demoLovelaceHome,
  entities: demoEntitiesHome,
  floors: demoFloorsHome,
  areas: demoAreasHome,
  theme: { theme: "default", dark: false },
};
