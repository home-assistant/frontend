import { DemoConfig } from "../types";
import { demoLovelaceKernehed } from "./lovelace";
import { demoEntitiesKernehed } from "./entities";

export const demoKernehed: DemoConfig = {
  authorName: "Kernehed",
  authorUrl: "https://github.com/kernehed",
  name: "Hem",
  lovelace: demoLovelaceKernehed,
  entities: demoEntitiesKernehed,
};
