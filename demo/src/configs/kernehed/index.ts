import { DemoConfig } from "../types";
import { demoLovelaceKernehed } from "./lovelace";
import { demoEntitiesKernehed } from "./entities";
import { demoThemeKernehed } from "./theme";

export const demoKernehed: DemoConfig = {
  authorName: "Kernehed",
  authorUrl: "https://github.com/kernehed",
  name: "Hem",
  lovelace: demoLovelaceKernehed,
  entities: demoEntitiesKernehed,
  theme: demoThemeKernehed,
};
