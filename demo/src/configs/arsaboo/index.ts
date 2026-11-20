import type { DemoConfig } from "../types";
import { demoEntitiesArsaboo } from "./entities";
import { demoLovelaceArsaboo } from "./lovelace";

export const demoArsaboo: DemoConfig = {
  authorName: "Arsaboo",
  authorUrl: "https://github.com/arsaboo/homeassistant-config/",
  name: "ARS Home",
  lovelace: demoLovelaceArsaboo,
  entities: demoEntitiesArsaboo,
  theme: { theme: "default", dark: false },
};
