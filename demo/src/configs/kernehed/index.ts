import { DemoConfig } from "../types";
import { demoEntitiesKernehed } from "./entities";
import { demoLovelaceKernehed } from "./lovelace";
import { demoThemeKernehed } from "./theme";

export const demoKernehed: DemoConfig = {
  authorName: "Kernehed",
  authorUrl: "https://github.com/kernehed",
  name: "Hem",
  lovelace: demoLovelaceKernehed,
  entities: demoEntitiesKernehed,
  theme: demoThemeKernehed,
};
