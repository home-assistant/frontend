import { DemoConfig } from "../types";
import { demoLovelaceArsaboo } from "./lovelace";
import { demoEntitiesArsaboo } from "./entities";
import { demoThemeArsaboo } from "./theme";

export const demoArsaboo: DemoConfig = {
  authorName: "Arsaboo",
  authorUrl: "https://github.com/arsaboo/homeassistant-config/",
  name: "ARS Home",
  lovelace: demoLovelaceArsaboo,
  entities: demoEntitiesArsaboo,
  theme: demoThemeArsaboo,
};
