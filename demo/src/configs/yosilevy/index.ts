import { DemoConfig } from "../types";
import { demoLovelaceYosilevy } from "./lovelace";
import { demoEntitiesYosilevy } from "./entities";
import { demoThemeYosilevy } from "./theme";

export const demoYosilevy: DemoConfig = {
  authorName: "YosiLevy",
  authorUrl: "https://github.com/yosilevy",
  name: "בית",
  lovelace: demoLovelaceYosilevy,
  entities: demoEntitiesYosilevy,
  theme: demoThemeYosilevy,
  //  language: "he",
};
