import { DemoConfig } from "../types";
import { demoLovelaceJimpower } from "./lovelace";
import { demoEntitiesJimpower } from "./entities";

export const demoJimpower: DemoConfig = {
  authorName: "Jimpower",
  authorUrl: "https://github.com/JamesMcCarthy79/Home-Assistant-Config",
  name: "Kingia Castle",
  lovelace: demoLovelaceJimpower,
  entities: demoEntitiesJimpower,
};
