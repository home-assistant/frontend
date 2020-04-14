import { DemoConfig } from "../types";
import { demoEntitiesArsaboo } from "./entities";
import { demoLovelaceArsaboo } from "./lovelace";
import { demoThemeArsaboo } from "./theme";

export const demoArsaboo: DemoConfig = {
  authorName: "Arsaboo",
  authorUrl: "https://github.com/arsaboo/homeassistant-config/",
  name: "ARS Home",
  lovelace: demoLovelaceArsaboo,
  entities: demoEntitiesArsaboo,
  theme: demoThemeArsaboo,
};
