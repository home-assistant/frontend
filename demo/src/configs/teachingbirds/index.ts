import { DemoConfig } from "../types";
import { demoEntitiesTeachingbirds } from "./entities";
import { demoLovelaceTeachingbirds } from "./lovelace";
import { demoThemeTeachingbirds } from "./theme";

export const demoTeachingbirds: DemoConfig = {
  authorName: "Isabella Gross Alström",
  authorUrl: "https://github.com/isabellaalstrom/",
  name: "Isa's mobile friendly LL",
  lovelace: demoLovelaceTeachingbirds,
  entities: demoEntitiesTeachingbirds,
  theme: demoThemeTeachingbirds,
};
