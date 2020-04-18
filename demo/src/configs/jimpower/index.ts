import { DemoConfig } from "../types";
import { demoEntitiesJimpower } from "./entities";
import { demoLovelaceJimpower } from "./lovelace";
import { demoThemeJimpower } from "./theme";

export const demoJimpower: DemoConfig = {
  authorName: "Jimpower",
  authorUrl: "https://github.com/JamesMcCarthy79/Home-Assistant-Config",
  name: "Kingia Castle",
  lovelace: demoLovelaceJimpower,
  entities: demoEntitiesJimpower,
  theme: demoThemeJimpower,
};
